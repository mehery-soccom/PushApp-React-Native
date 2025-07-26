//
//  LiveActivityAttributes.swift
//  MeheryEventSenderExample
//
//  Created by Neil Carnac on 26/07/25.
//

import Foundation
import ActivityKit

struct LiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var driverName: String
        var rating: String
        var progress: Double
        var duration: Int
    }
}
