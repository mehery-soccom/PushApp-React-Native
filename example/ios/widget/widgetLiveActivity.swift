//
//  widgetLiveActivity.swift
//  widget
//
//  Created by Neil Carnac on 26/07/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

//struct LiveActivityAttributes: ActivityAttributes {
//    public struct ContentState: Codable, Hashable {
//        var driverName: String
//        var rating: String
//        var progress: Double
//        var duration: Int
//    }
//}

struct widgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: LiveActivityAttributes.self) { context in
            // Lock screen UI goes here
            VStack(alignment: .leading) {
                Text("Driver: \(context.state.driverName)")
                Text("Rating: \(context.state.rating)")
                ProgressView(value: context.state.progress)
                Text("Duration: \(context.state.duration) mins")
            }
            .padding()
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view UI goes here
                DynamicIslandExpandedRegion(.leading) {
                    Text(context.state.driverName)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.rating)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    ProgressView(value: context.state.progress)
                }
            } compactLeading: {
                Text("🚗")
            } compactTrailing: {
                Text(context.state.rating)
            } minimal: {
                Text("⏱️")
            }
        }
    }
}

extension LiveActivityAttributes {
    static var preview: LiveActivityAttributes {
        LiveActivityAttributes()
    }
}

extension LiveActivityAttributes.ContentState {
    static var preview: LiveActivityAttributes.ContentState {
        LiveActivityAttributes.ContentState(
            driverName: "Jeyhaan",
            rating: "4.9",
            progress: 0.75,
            duration: 20
        )
    }
}

#Preview("Notification", as: .content, using: LiveActivityAttributes.preview) {
  widgetLiveActivity()
} contentStates: {
    LiveActivityAttributes.ContentState.preview
}
