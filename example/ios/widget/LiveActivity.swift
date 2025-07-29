//
//  LiveActivity.swift
//  MeheryEventSenderExample
//
//  Created by Neil Carnac on 26/07/25.
//

import Foundation
import ActivityKit
import os // 👈 ADD THIS

let logger = Logger(subsystem: "com.yourcompany.MeheryEventSenderExample", category: "LiveActivity")


struct LiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var driverName: String
        var rating: String
        var progress: Double
        var duration: Int
    }
}

@objc(LiveActivity) // This must match the module name in your Objective-C bridge
class LiveActivity: NSObject {
  
  @objc static let sharedActivity = LiveActivity()
  
  @objc(startActivity:rating:duration:progress:)
  func startActivity(driverName: String, rating: String, duration: Int, progress: Double) {
    if #available(iOS 16.1, *) {
      let attributes = LiveActivityAttributes()
      let contentState = LiveActivityAttributes.ContentState(
        driverName: driverName,
        rating: rating,
        progress: progress,
        duration: duration
      )
      do {
        let activity = try Activity<LiveActivityAttributes>.request(
            attributes: attributes,
            contentState: contentState,
            pushType: .token
          )

          // ✅ Monitor push token
          Task {
            for await pushToken in activity.pushTokenUpdates {
              let pushTokenString = pushToken.reduce("") {
                $0 + String(format: "%02x", $1)
              }
              print("New push token: \(pushTokenString)")
            }
          }

        print("Started Live Activity with ID: \(activity.id)")
      } catch {
        print("Failed to start activity: \(error)")
      }
    } else {
      print("Live Activities not supported on this iOS version.")
    }
  }

  @objc(updateActivity:rating:duration:progress:)
  func updateActivity(driverName: String, rating: String, duration: Int, progress: Double) {
    if #available(iOS 16.1, *) {
      Task {
        let contentState = LiveActivityAttributes.ContentState(
          driverName: driverName,
          rating: rating,
          progress: progress,
          duration: duration
        )
        for activity in Activity<LiveActivityAttributes>.activities {
          await activity.update(using: contentState)
        }
      }
    }
  }

  @objc(endActivity)
  func endActivity() {
    if #available(iOS 16.1, *) {
      Task {
        for activity in Activity<LiveActivityAttributes>.activities {
          await activity.end(dismissalPolicy: .immediate)
        }
      }
    }
  }
}
