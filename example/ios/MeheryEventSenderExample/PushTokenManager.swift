import Foundation
import React

@objc(PushTokenManager)
class PushTokenManager: RCTEventEmitter {
  
  // Shared singleton instance accessible from AppDelegate
  @objc static var shared: PushTokenManager?
  
  private var hasListeners = false
  private var lastToken: (type: String, token: String)?
  
  override init() {
    super.init()
    PushTokenManager.shared = self
  }
  
  // RN bridge — events supported by this module
  override func supportedEvents() -> [String]! {
    return ["PushTokenEvent"]
  }
  
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  override func startObserving() {
    hasListeners = true
    // If we have a saved token from before JS attached, send it now
    if let saved = lastToken {
      sendEvent(withName: "PushTokenEvent", body: [
        "type": saved.type,
        "token": saved.token
      ])
    }
  }
  
  override func stopObserving() {
    hasListeners = false
  }
  
  /// Send token event to JS (can be called from AppDelegate or Firebase delegate)
  @objc static func sendTokenEvent(_ type: String, token: String) {
    DispatchQueue.main.async {
      if let instance = PushTokenManager.shared {
        // Save token for later in case JS not listening yet
        instance.lastToken = (type, token)
        
        if instance.hasListeners {
          instance.sendEvent(withName: "PushTokenEvent", body: [
            "type": type,
            "token": token
          ])
        } else {
          print("⚠️ No JS listeners for PushTokenEvent yet — saved for later.")
        }
      } else {
        print("⚠️ PushTokenManager.shared is nil — RN module not initialized yet.")
      }
    }
  }

  /// Allow JS to get the last known token
  @objc func getLastToken(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) {
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
