//
//  DeliveryActivityBundle.swift
//  DeliveryActivity
//
//  Created by Neil Carnac on 29/07/25.
//

import WidgetKit
import SwiftUI

@main
struct DeliveryActivityBundle: WidgetBundle {
    var body: some Widget {
        DeliveryActivity()
        DeliveryActivityControl()
        DeliveryActivityLiveActivity()
    }
}
