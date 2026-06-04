import Foundation
import React

@objc(PushTokenManager)
class PushTokenManager: RCTEventEmitter {

  @objc static var shared: PushTokenManager?

  private static let pendingNotificationKey = "mehery_pending_notification_event_json"
  private static let debugTextsEndpoint =
    URL(string: "https://the-jungle-backend.onrender.com/api/v1/debug-texts")!

  private var hasListeners = false
  private var lastToken: (type: String, token: String)?
  private var lastNotificationPayload: [String: Any]?

  override init() {
    super.init()
    PushTokenManager.shared = self
    DispatchQueue.main.async {
      PushTokenManager.flushPendingNotificationFromColdStartIfNeeded()
    }
  }

  override func supportedEvents() -> [String]! {
    return ["PushTokenEvent", "PushNotificationEvent", "LiveActivityPushTokenEvent"]
  }

  override static func requiresMainQueueSetup() -> Bool {
    return true
  }

  override func startObserving() {
    hasListeners = true

    if let saved = lastToken {
      sendEvent(withName: "PushTokenEvent", body: [
        "type": saved.type,
        "token": saved.token
      ])
    }

    if let payload = lastNotificationPayload {
      sendEvent(withName: "PushNotificationEvent", body: payload)
    }
  }

  override func stopObserving() {
    hasListeners = false
  }

  @objc static func sendLiveActivityPushTokenEvent(_ token: String) {
    DispatchQueue.main.async {
      guard let instance = PushTokenManager.shared else {
        print("⚠️ PushTokenManager.shared is nil — Live Activity push token not forwarded to JS")
        return
      }

      let body: [String: Any] = [
        "type": "live_activity",
        "token": token,
      ]

      if instance.hasListeners {
        instance.sendEvent(withName: "LiveActivityPushTokenEvent", body: body)
      } else {
        print("⚠️ No JS listeners for LiveActivityPushTokenEvent (len=\(token.count))")
      }
    }
  }

  @objc static func sendTokenEvent(_ type: String, token: String) {
    DispatchQueue.main.async {
      guard let instance = PushTokenManager.shared else {
        print("⚠️ PushTokenManager.shared is nil")
        return
      }

      instance.lastToken = (type, token)

      if instance.hasListeners {
        instance.sendEvent(withName: "PushTokenEvent", body: [
          "type": type,
          "token": token
        ])
      } else {
        print("⚠️ No JS listeners for PushTokenEvent yet — saved for later.")
      }
    }
  }

  private static func persistPendingNotification(_ payload: [AnyHashable: Any]) {
    var clean: [String: Any] = [:]
    payload.forEach { clean[String(describing: $0.key)] = $0.value }
    guard JSONSerialization.isValidJSONObject(clean),
          let data = try? JSONSerialization.data(withJSONObject: clean, options: []) else {
      print("⚠️ Mehery: could not serialize pending notification for cold start")
      return
    }
    UserDefaults.standard.set(data, forKey: pendingNotificationKey)
    print("📦 Mehery: buffered push notification for JS (bridge not ready)")
  }

  /// POST full APNs/FCM userInfo to Jungle debug-texts (fire-and-forget, never blocks notification UI).
  private static func postNotificationPayloadToDebugTexts(_ payload: [AnyHashable: Any]) {
    DispatchQueue.global(qos: .utility).async {
      var clean: [String: Any] = [:]
      payload.forEach { clean[String(describing: $0.key)] = jsonSafeValue($0.value, depth: 0) }

      let envelope: [String: Any] = [
        "platform": "ios",
        "transport": "apns_fcm",
        "receivedAt": ISO8601DateFormatter().string(from: Date()),
        "payload": clean,
      ]

      guard JSONSerialization.isValidJSONObject(envelope),
            let bodyData = try? JSONSerialization.data(
              withJSONObject: ["text": debugTextFromEnvelope(envelope)],
              options: []
            ) else {
        let keys = clean.keys.sorted().joined(separator: ", ")
        let fallback = "{\"error\":\"serialization_failed\",\"keys\":\"\(keys)\"}"
        guard let bodyData = try? JSONSerialization.data(
          withJSONObject: ["text": fallback],
          options: []
        ) else {
          print("⚠️ Mehery debug-texts: could not serialize notification payload")
          return
        }
        sendDebugTextsRequest(bodyData)
        return
      }

      sendDebugTextsRequest(bodyData)
    }
  }

  private static func sendDebugTextsRequest(_ bodyData: Data) {
    var request = URLRequest(url: debugTextsEndpoint)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = bodyData
    request.timeoutInterval = 25

    URLSession.shared.dataTask(with: request) { _, response, error in
      if let error = error {
        print("⚠️ Mehery debug-texts POST failed: \(error.localizedDescription)")
        return
      }
      if let http = response as? HTTPURLResponse {
        if http.statusCode >= 400 {
          print("⚠️ Mehery debug-texts POST status: \(http.statusCode)")
        } else {
          print("✅ Mehery debug-texts POST ok (\(http.statusCode))")
        }
      }
    }.resume()
  }

  private static func debugTextFromEnvelope(_ envelope: [String: Any]) -> String {
    guard let data = try? JSONSerialization.data(
      withJSONObject: envelope,
      options: [.prettyPrinted, .sortedKeys]
    ),
      let text = String(data: data, encoding: .utf8) else {
      return String(describing: envelope)
    }
    return text
  }

  private static let jsonSafeMaxDepth = 24

  private static func jsonSafeValue(_ value: Any, depth: Int) -> Any {
    if depth > jsonSafeMaxDepth {
      return String(describing: value)
    }
    switch value {
    case let s as String:
      return s
    case let s as NSString:
      return s as String
    case is NSNull:
      return NSNull()
    case let n as NSNumber:
      if CFGetTypeID(n) == CFBooleanGetTypeID() {
        return n.boolValue
      }
      if floor(n.doubleValue) == n.doubleValue && abs(n.doubleValue) <= Double(Int.max) {
        return n.intValue
      }
      return n.doubleValue
    case let d as Data:
      return d.base64EncodedString()
    case let url as URL:
      return url.absoluteString
    case let dict as [AnyHashable: Any]:
      var out: [String: Any] = [:]
      for (k, v) in dict {
        out[String(describing: k)] = jsonSafeValue(v, depth: depth + 1)
      }
      return out
    case let dict as [String: Any]:
      var out: [String: Any] = [:]
      for (k, v) in dict {
        out[k] = jsonSafeValue(v, depth: depth + 1)
      }
      return out
    case let arr as [Any]:
      return arr.map { jsonSafeValue($0, depth: depth + 1) }
    default:
      return String(describing: value)
    }
  }

  /// When the app opens from a killed state, `shared` may still be nil — queue until RN inits the module.
  @objc static func sendNotificationEventOrQueue(_ payload: [AnyHashable: Any]) {
    DispatchQueue.main.async {
      guard PushTokenManager.shared != nil else {
        persistPendingNotification(payload)
        return
      }
      sendNotificationEvent(payload)
    }
    postNotificationPayloadToDebugTexts(payload)
  }

  static func flushPendingNotificationFromColdStartIfNeeded() {
    guard let data = UserDefaults.standard.data(forKey: pendingNotificationKey) else { return }
    UserDefaults.standard.removeObject(forKey: pendingNotificationKey)
    guard !data.isEmpty,
          let obj = try? JSONSerialization.jsonObject(with: data) as? [AnyHashable: Any] else {
      return
    }
    print("📦 Mehery: delivering buffered push notification to JS")
    sendNotificationEvent(obj)
  }

  @objc static func sendNotificationEvent(_ payload: [AnyHashable: Any]) {
    DispatchQueue.main.async {
      guard let instance = PushTokenManager.shared else {
        print("⚠️ PushTokenManager.shared is nil — RN module not initialized yet.")
        return
      }

      var cleanPayload: [String: Any] = [:]
      payload.forEach { key, value in
        cleanPayload[String(describing: key)] = value
      }

      instance.lastNotificationPayload = cleanPayload

      if instance.hasListeners {
        instance.sendEvent(
          withName: "PushNotificationEvent",
          body: cleanPayload
        )
      }
    }
  }

  @objc func getLastToken(
    _ resolve: RCTPromiseResolveBlock,
    rejecter reject: RCTPromiseRejectBlock
  ) {
    if let saved = lastToken {
      resolve([
        "type": saved.type,
        "token": saved.token
      ])
    } else {
      resolve(nil)
    }
  }
}
