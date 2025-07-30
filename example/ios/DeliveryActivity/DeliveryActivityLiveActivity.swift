//
//  DeliveryActivityLiveActivity.swift
//  DeliveryActivity
//
//  Created by neilll on 07/05/25.
//

import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Attributes

struct DeliveryActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var message1: String
        var message2: String
        var message3: String

        var message1FontSize: Double
        var message1FontColorHex: String
        var line1_font_text_styles: [String]

        var message2FontSize: Double
        var message2FontColorHex: String
        var line2_font_text_styles: [String]

        var message3FontSize: Double
        var message3FontColorHex: String
        var line3_font_text_styles: [String]

        var backgroundColorHex: String
        var fontColorHex: String
        var progressColorHex: String
        var fontSize: Double

        var progressPercent: Double
        var align: String
        var bg_color_gradient: String
        var bg_color_gradient_dir: String
        var imageFileName: String?
    }
}

// MARK: - Live Activity Widget

@available(iOS 16.2, *)
struct DeliveryActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryActivityAttributes.self) { context in
            // Lock Screen / Banner
            HStack {
                VStack(alignment: .leading, spacing: 6) {
                    // Message 1
                    let _ = print("🎨 Applying styles to message1: \(context.state.line1_font_text_styles)")
                    Text(context.state.message1)
                        .font(
                            .system(
                                size: context.state.message1FontSize,
                                weight: context.state.line1_font_text_styles.contains("bold") ? .bold : .regular,
                                design: context.state.line1_font_text_styles.contains("italic") ? .serif : .default
                            )
                        )
                        .foregroundColor(colorFromHex(context.state.message1FontColorHex))
                        .modifier(TextStyleModifier(styles: context.state.line1_font_text_styles))

                    // Message 2
                    let _ = print("🎨 Applying styles to message2: \(context.state.line2_font_text_styles)")
                    Text(context.state.message2)
                        .font(
                            .system(
                                size: context.state.message2FontSize,
                                weight: context.state.line2_font_text_styles.contains("bold") ? .bold : .regular,
                                design: context.state.line2_font_text_styles.contains("italic") ? .serif : .default
                            )
                        )
                        .foregroundColor(colorFromHex(context.state.message2FontColorHex))
                        .modifier(TextStyleModifier(styles: context.state.line2_font_text_styles))

                    // Message 3
                    let _ = print("🎨 Applying styles to message3: \(context.state.line3_font_text_styles)")
                    Text(context.state.message3)
                        .font(
                            .system(
                                size: context.state.message3FontSize,
                                weight: context.state.line3_font_text_styles.contains("bold") ? .bold : .regular,
                                design: context.state.line3_font_text_styles.contains("italic") ? .serif : .default
                            )
                        )
                        .foregroundColor(colorFromHex(context.state.message3FontColorHex))
                        .modifier(TextStyleModifier(styles: context.state.line3_font_text_styles))

                    // Progress Bar
                    ProgressView(value: context.state.progressPercent)
                        .progressViewStyle(
                            LinearProgressViewStyle(tint: colorFromHex(context.state.progressColorHex))
                        )
                        .frame(height: 6)
                        .clipShape(Capsule())
                }

                Spacer()

                // Image
                if let imageFileName = context.state.imageFileName,
                   let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.com.mehery.admin.meheryAdmin") {
                    let imageURL = containerURL.appendingPathComponent(imageFileName)
                    if let uiImage = UIImage(contentsOfFile: imageURL.path) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFit()
                            .frame(height: 100)
                    } else {
                        Text("Image not found")
                    }
                }
            }
            .padding()
            .background(backgroundView(for: context.state))
            .activityBackgroundTint(colorFromHex(context.state.backgroundColorHex))
            .activitySystemActionForegroundColor(colorFromHex(context.state.fontColorHex))
            .environment(\.layoutDirection, context.state.align == "right" ? .rightToLeft : .leftToRight)

        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "shippingbox")
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\(Int(context.state.progressPercent * 100))%")
                        .font(.system(size: context.state.fontSize))
                        .bold()
                        .foregroundColor(colorFromHex(context.state.fontColorHex))
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading) {
                        Text(context.state.message1)
                            .font(.caption)
                            .foregroundColor(.gray)

                        Text("Progress: \(Int(context.state.progressPercent * 100))%")
                            .bold()
                            .foregroundColor(colorFromHex(context.state.fontColorHex))
                    }
                }
            } compactLeading: {
                Text("Progress")
                    .font(.caption)
                    .foregroundColor(colorFromHex(context.state.fontColorHex))
            } compactTrailing: {
                Text("\(Int(context.state.progressPercent * 100))%")
                    .font(.caption)
                    .foregroundColor(colorFromHex(context.state.fontColorHex))
            } minimal: {
                Image(systemName: "clock")
                    .foregroundColor(colorFromHex(context.state.fontColorHex))
            }
            .keylineTint(colorFromHex(context.state.progressColorHex))
        }
    }
}

// MARK: - Helpers

private func backgroundView(for state: DeliveryActivityAttributes.ContentState) -> some View {
    if !state.bg_color_gradient.isEmpty, !state.bg_color_gradient_dir.isEmpty {
        let startColor = colorFromHex(state.backgroundColorHex)
        let endColor = colorFromHex(state.bg_color_gradient)
        let (startPoint, endPoint) = gradientDirection(from: state.bg_color_gradient_dir)

        return AnyView(
            LinearGradient(
                gradient: Gradient(colors: [startColor, endColor]),
                startPoint: startPoint,
                endPoint: endPoint
            )
        )
    } else {
        return AnyView(colorFromHex(state.backgroundColorHex))
    }
}

private func gradientDirection(from dir: String) -> (UnitPoint, UnitPoint) {
    switch dir.lowercased() {
    case "horizontal": return (.leading, .trailing)
    case "vertical": return (.top, .bottom)
    default: return (.top, .bottom)
    }
}

private func colorFromHex(_ hex: String) -> Color {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    if hexSanitized.hasPrefix("#") {
        hexSanitized.removeFirst()
    }

    var rgb: UInt64 = 0
    Scanner(string: hexSanitized).scanHexInt64(&rgb)

    return Color(
        red: Double((rgb & 0xFF0000) >> 16) / 255,
        green: Double((rgb & 0x00FF00) >> 8) / 255,
        blue: Double(rgb & 0x0000FF) / 255
    )
}

// MARK: - Text Style Modifier

struct TextStyleModifier: ViewModifier {
    let styles: [String]

    func body(content: Content) -> some View {
        let _ = print("🎨 TextStyleModifier called with styles: \(styles)")
      if #available(iOS 16.0, *) {
        return content.underline(styles.contains("underline"))
      } else {
        // Fallback on earlier versions
        return content
      }
    }
}

// MARK: - Preview

extension DeliveryActivityAttributes {
    fileprivate static var preview: DeliveryActivityAttributes {
        DeliveryActivityAttributes()
    }
}

extension DeliveryActivityAttributes.ContentState {
    fileprivate static var preview: DeliveryActivityAttributes.ContentState {
        .init(
            message1: "Blinkit",
            message2: "Your order is on its way",
            message3: "Expect delivery soon",
            message1FontSize: 18,
            message1FontColorHex: "#FFFFFF",
            line1_font_text_styles: ["bold"],
            message2FontSize: 16,
            message2FontColorHex: "#FFFF00",
            line2_font_text_styles: ["italic"],
            message3FontSize: 14,
            message3FontColorHex: "#00FF00",
            line3_font_text_styles: ["underline"],
            backgroundColorHex: "#000000",
            fontColorHex: "#FFFFFF",
            progressColorHex: "#FFFFFF",
            fontSize: 14,
            progressPercent: 0.2,
            align: "left",
            bg_color_gradient: "#080000",
            bg_color_gradient_dir: "horizontal"
        )
    }
}

@available(iOS 18.0, *)
#Preview("Live Activity", as: .content, using: DeliveryActivityAttributes.preview) {
    DeliveryActivityLiveActivity()
} contentStates: {
    DeliveryActivityAttributes.ContentState.preview
}
