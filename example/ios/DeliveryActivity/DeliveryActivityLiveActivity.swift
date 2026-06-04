// //
// //  DeliveryActivityLiveActivity.swift
// //  DeliveryActivity
// //
// //  Created by neilll on 07/05/25.
// //

// import ActivityKit
// import WidgetKit
// import SwiftUI

// // MARK: - Attributes

// struct DeliveryActivityAttributes: ActivityAttributes {
//     public struct ContentState: Codable, Hashable {
//         var message1: String
//         var message2: String
//         var message3: String

//         var message1FontSize: Double
//         var message1FontColorHex: String
//         var line1_font_text_styles: [String]

//         var message2FontSize: Double
//         var message2FontColorHex: String
//         var line2_font_text_styles: [String]

//         var message3FontSize: Double
//         var message3FontColorHex: String
//         var line3_font_text_styles: [String]

//         var backgroundColorHex: String
//         var fontColorHex: String
//         var progressColorHex: String
//         var fontSize: Double

//         var progressPercent: Double
//         var align: String
//         var bg_color_gradient: String
//         var bg_color_gradient_dir: String
//         var imageFileName: String?
//     }
// }

// // MARK: - Image Loader

// private func loadImage(from fileName: String?) -> Image? {
//     guard
//         let fileName = fileName,
//         !fileName.isEmpty,
//         let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.meheryeventsender.example.NotificationLiveActivity")
//     else {
//         print("❌ Missing image filename or container URL")
//         return nil
//     }

//     let imageURL = containerURL.appendingPathComponent(fileName)
//     print("📂 Looking for image at path: \(imageURL.path)")

//     if !FileManager.default.fileExists(atPath: imageURL.path) {
//         print("❌ Image file does NOT exist at \(imageURL.path)")
//         return nil
//     }

//     guard let uiImage = UIImage(contentsOfFile: imageURL.path) else {
//         print("❌ Failed to load UIImage from \(imageURL.path)")
//         return nil
//     }

//     print("✅ Successfully loaded image: \(fileName)")
//     return Image(uiImage: uiImage).resizable()
// }

// // MARK: - Live Activity Widget

// @available(iOS 16.2, *)
// struct DeliveryActivityLiveActivity: Widget {
//     var body: some WidgetConfiguration {
//         ActivityConfiguration(for: DeliveryActivityAttributes.self) { context in
//             // Lock Screen / Banner UI
//             HStack {
//                 VStack(alignment: .leading, spacing: 6) {
//                     // Line 1
//                     Text(context.state.message1)
//                         .font(.system(
//                             size: context.state.message1FontSize,
//                             weight: context.state.line1_font_text_styles.contains("bold") ? .bold : .regular,
//                             design: context.state.line1_font_text_styles.contains("italic") ? .serif : .default
//                         ))
//                         .foregroundColor(colorFromHex(context.state.message1FontColorHex))
//                         .modifier(TextStyleModifier(styles: context.state.line1_font_text_styles))

//                     // Line 2
//                     Text(context.state.message2)
//                         .font(.system(
//                             size: context.state.message2FontSize,
//                             weight: context.state.line2_font_text_styles.contains("bold") ? .bold : .regular,
//                             design: context.state.line2_font_text_styles.contains("italic") ? .serif : .default
//                         ))
//                         .foregroundColor(colorFromHex(context.state.message2FontColorHex))
//                         .modifier(TextStyleModifier(styles: context.state.line2_font_text_styles))

//                     // Line 3
//                     Text(context.state.message3)
//                         .font(.system(
//                             size: context.state.message3FontSize,
//                             weight: context.state.line3_font_text_styles.contains("bold") ? .bold : .regular,
//                             design: context.state.line3_font_text_styles.contains("italic") ? .serif : .default
//                         ))
//                         .foregroundColor(colorFromHex(context.state.message3FontColorHex))
//                         .modifier(TextStyleModifier(styles: context.state.line3_font_text_styles))

//                     // Progress Bar
//                     ProgressView(value: context.state.progressPercent)
//                         .progressViewStyle(LinearProgressViewStyle(tint: colorFromHex(context.state.progressColorHex)))
//                         .frame(height: 6)
//                         .clipShape(Capsule())
//                 }

//                 Spacer()

//                 // Image
//                 if let image = loadImage(from: context.state.imageFileName) {
//                     image
//                         .scaledToFit()
//                         .frame(height: 100)
//                         .clipShape(RoundedRectangle(cornerRadius: 12))
//                 } else {
//                     VStack {
//                         Image(systemName: "photo")
//                             .resizable()
//                             .scaledToFit()
//                             .frame(width: 60, height: 60)
//                             .foregroundColor(.gray)
//                         Text("No image")
//                             .font(.caption)
//                             .foregroundColor(.gray)
//                     }
//                 }
//             }
//             .padding()
//             .background(backgroundView(for: context.state))
//             .activityBackgroundTint(colorFromHex(context.state.backgroundColorHex))
//             .activitySystemActionForegroundColor(colorFromHex(context.state.fontColorHex))
//             .environment(\.layoutDirection, context.state.align == "right" ? .rightToLeft : .leftToRight)

//         } dynamicIsland: { context in
//             DynamicIsland {
//                 DynamicIslandExpandedRegion(.leading) {
//                     Image(systemName: "shippingbox")
//                 }
//                 DynamicIslandExpandedRegion(.trailing) {
//                     Text("\(Int(context.state.progressPercent * 100))%")
//                         .font(.system(size: context.state.fontSize))
//                         .bold()
//                         .foregroundColor(colorFromHex(context.state.fontColorHex))
//                 }
//                 DynamicIslandExpandedRegion(.bottom) {
//                     VStack(alignment: .leading) {
//                         Text(context.state.message1)
//                             .font(.caption)
//                             .foregroundColor(.gray)

//                         Text("Progress: \(Int(context.state.progressPercent * 100))%")
//                             .bold()
//                             .foregroundColor(colorFromHex(context.state.fontColorHex))
//                     }
//                 }
//             } compactLeading: {
//                 Image(systemName: "shippingbox")
//             } compactTrailing: {
//                 Text("\(Int(context.state.progressPercent * 100))%")
//             } minimal: {
//                 Image(systemName: "clock")
//             }
//             .keylineTint(colorFromHex(context.state.progressColorHex))
//         }
//     }
// }

// // MARK: - Helpers

// private func backgroundView(for state: DeliveryActivityAttributes.ContentState) -> some View {
//     if !state.bg_color_gradient.isEmpty, !state.bg_color_gradient_dir.isEmpty {
//         let startColor = colorFromHex(state.backgroundColorHex)
//         let endColor = colorFromHex(state.bg_color_gradient)
//         let (startPoint, endPoint) = gradientDirection(from: state.bg_color_gradient_dir)
//         return AnyView(
//             LinearGradient(
//                 gradient: Gradient(colors: [startColor, endColor]),
//                 startPoint: startPoint,
//                 endPoint: endPoint
//             )
//         )
//     } else {
//         return AnyView(colorFromHex(state.backgroundColorHex))
//     }
// }

// private func gradientDirection(from dir: String) -> (UnitPoint, UnitPoint) {
//     switch dir.lowercased() {
//     case "horizontal": return (.leading, .trailing)
//     case "vertical": return (.top, .bottom)
//     default: return (.top, .bottom)
//     }
// }

// private func colorFromHex(_ hex: String) -> Color {
//     var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
//     if hexSanitized.hasPrefix("#") {
//         hexSanitized.removeFirst()
//     }
//     var rgb: UInt64 = 0
//     Scanner(string: hexSanitized).scanHexInt64(&rgb)
//     return Color(
//         red: Double((rgb & 0xFF0000) >> 16) / 255,
//         green: Double((rgb & 0x00FF00) >> 8) / 255,
//         blue: Double(rgb & 0x0000FF) / 255
//     )
// }

// // MARK: - Text Style Modifier

// struct TextStyleModifier: ViewModifier {
//     let styles: [String]

//     func body(content: Content) -> some View {
//         if #available(iOS 16.0, *) {
//             return content.underline(styles.contains("underline"))
//         } else {
//             return content
//         }
//     }
// }

// // MARK: - Preview

// extension DeliveryActivityAttributes {
//     fileprivate static var preview: DeliveryActivityAttributes { DeliveryActivityAttributes() }
// }

// extension DeliveryActivityAttributes.ContentState {
//     fileprivate static var preview: DeliveryActivityAttributes.ContentState {
//         .init(
//             message1: "Blinkit",
//             message2: "Your order is on its way",
//             message3: "Expect delivery soon",
//             message1FontSize: 18,
//             message1FontColorHex: "#FFFFFF",
//             line1_font_text_styles: ["bold"],
//             message2FontSize: 16,
//             message2FontColorHex: "#FFFF00",
//             line2_font_text_styles: ["italic"],
//             message3FontSize: 14,
//             message3FontColorHex: "#00FF00",
//             line3_font_text_styles: ["underline"],
//             backgroundColorHex: "#000000",
//             fontColorHex: "#FFFFFF",
//             progressColorHex: "#FFFFFF",
//             fontSize: 14,
//             progressPercent: 0.2,
//             align: "left",
//             bg_color_gradient: "#080000",
//             bg_color_gradient_dir: "horizontal",
//             imageFileName: "delivery_icon.png"
//         )
//     }
// }

// @available(iOS 18.0, *)
// #Preview("Live Activity", as: .content, using: DeliveryActivityAttributes.preview) {
//     DeliveryActivityLiveActivity()
// } contentStates: {
//     DeliveryActivityAttributes.ContentState.preview
// }

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
        var align : String
        var bg_color_gradient : String
        var bg_color_gradient_dir : String
        var imageFileName: String?
        var imageUrl: String?
        var logoFileName: String?
        var logoUrl: String?
        var deliveryState: String
        var deliveryUi: String
        var milestoneStep: Int
        var milestoneTotal: Int
        var milestoneLabelsJson: String

        enum CodingKeys: String, CodingKey {
            case message1, message2, message3
            case message1FontSize, message1FontColorHex, line1_font_text_styles
            case message2FontSize, message2FontColorHex, line2_font_text_styles
            case message3FontSize, message3FontColorHex, line3_font_text_styles
            case backgroundColorHex, fontColorHex, progressColorHex, fontSize
            case progressPercent, align, bg_color_gradient, bg_color_gradient_dir
            case imageFileName, imageUrl, logoFileName, logoUrl
            case deliveryState, deliveryUi, milestoneStep, milestoneTotal
            case delivery_state, delivery_ui, milestone_step, milestone_total
            case milestoneLabelsJson, milestone_labels, milestoneLabels
        }

        init(
            message1: String, message2: String, message3: String,
            message1FontSize: Double, message1FontColorHex: String, line1_font_text_styles: [String],
            message2FontSize: Double, message2FontColorHex: String, line2_font_text_styles: [String],
            message3FontSize: Double, message3FontColorHex: String, line3_font_text_styles: [String],
            backgroundColorHex: String, fontColorHex: String, progressColorHex: String, fontSize: Double,
            progressPercent: Double, align: String, bg_color_gradient: String, bg_color_gradient_dir: String,
            imageFileName: String?, imageUrl: String?, logoFileName: String?, logoUrl: String?,
            deliveryState: String, deliveryUi: String, milestoneStep: Int, milestoneTotal: Int,
            milestoneLabelsJson: String = "[\"Placed\",\"Preparing\",\"On the way\",\"Delivered\"]"
        ) {
            self.message1 = message1
            self.message2 = message2
            self.message3 = message3
            self.message1FontSize = message1FontSize
            self.message1FontColorHex = message1FontColorHex
            self.line1_font_text_styles = line1_font_text_styles
            self.message2FontSize = message2FontSize
            self.message2FontColorHex = message2FontColorHex
            self.line2_font_text_styles = line2_font_text_styles
            self.message3FontSize = message3FontSize
            self.message3FontColorHex = message3FontColorHex
            self.line3_font_text_styles = line3_font_text_styles
            self.backgroundColorHex = backgroundColorHex
            self.fontColorHex = fontColorHex
            self.progressColorHex = progressColorHex
            self.fontSize = fontSize
            self.progressPercent = progressPercent
            self.align = align
            self.bg_color_gradient = bg_color_gradient
            self.bg_color_gradient_dir = bg_color_gradient_dir
            self.imageFileName = imageFileName
            self.imageUrl = imageUrl
            self.logoFileName = logoFileName
            self.logoUrl = logoUrl
            self.deliveryState = deliveryState
            self.deliveryUi = deliveryUi
            self.milestoneStep = milestoneStep
            self.milestoneTotal = milestoneTotal
            self.milestoneLabelsJson = milestoneLabelsJson
        }

        init(from decoder: Decoder) throws {
            let c = try decoder.container(keyedBy: CodingKeys.self)
            message1 = try c.decodeIfPresent(String.self, forKey: .message1) ?? ""
            message2 = try c.decodeIfPresent(String.self, forKey: .message2) ?? ""
            message3 = try c.decodeIfPresent(String.self, forKey: .message3) ?? ""
            message1FontSize = try c.decodeIfPresent(Double.self, forKey: .message1FontSize) ?? 14
            message1FontColorHex = try c.decodeIfPresent(String.self, forKey: .message1FontColorHex) ?? "#FFFFFF"
            line1_font_text_styles = try c.decodeIfPresent([String].self, forKey: .line1_font_text_styles) ?? []
            message2FontSize = try c.decodeIfPresent(Double.self, forKey: .message2FontSize) ?? 14
            message2FontColorHex = try c.decodeIfPresent(String.self, forKey: .message2FontColorHex) ?? "#B0B0B0"
            line2_font_text_styles = try c.decodeIfPresent([String].self, forKey: .line2_font_text_styles) ?? []
            message3FontSize = try c.decodeIfPresent(Double.self, forKey: .message3FontSize) ?? 14
            message3FontColorHex = try c.decodeIfPresent(String.self, forKey: .message3FontColorHex) ?? "#FFFFFF"
            line3_font_text_styles = try c.decodeIfPresent([String].self, forKey: .line3_font_text_styles) ?? []
            backgroundColorHex = try c.decodeIfPresent(String.self, forKey: .backgroundColorHex) ?? "#1A1A1A"
            fontColorHex = try c.decodeIfPresent(String.self, forKey: .fontColorHex) ?? "#FFFFFF"
            progressColorHex = try c.decodeIfPresent(String.self, forKey: .progressColorHex) ?? "#FFFFFF"
            fontSize = try c.decodeIfPresent(Double.self, forKey: .fontSize) ?? 14
            progressPercent = try c.decodeIfPresent(Double.self, forKey: .progressPercent) ?? 0
            align = try c.decodeIfPresent(String.self, forKey: .align) ?? "left"
            bg_color_gradient = try c.decodeIfPresent(String.self, forKey: .bg_color_gradient) ?? ""
            bg_color_gradient_dir = try c.decodeIfPresent(String.self, forKey: .bg_color_gradient_dir) ?? ""
            imageFileName = try c.decodeIfPresent(String.self, forKey: .imageFileName)
            imageUrl = try c.decodeIfPresent(String.self, forKey: .imageUrl)
            logoFileName = try c.decodeIfPresent(String.self, forKey: .logoFileName)
            logoUrl = try c.decodeIfPresent(String.self, forKey: .logoUrl)
            deliveryState = try c.decodeIfPresent(String.self, forKey: .deliveryState)
                ?? c.decodeIfPresent(String.self, forKey: .delivery_state) ?? ""
            deliveryUi = try c.decodeIfPresent(String.self, forKey: .deliveryUi)
                ?? c.decodeIfPresent(String.self, forKey: .delivery_ui) ?? "v1"
            milestoneStep = try c.decodeIfPresent(Int.self, forKey: .milestoneStep)
                ?? c.decodeIfPresent(Int.self, forKey: .milestone_step) ?? 1
            milestoneTotal = try c.decodeIfPresent(Int.self, forKey: .milestoneTotal)
                ?? c.decodeIfPresent(Int.self, forKey: .milestone_total) ?? 4
            milestoneLabelsJson = try c.decodeIfPresent(String.self, forKey: .milestoneLabelsJson)
                ?? c.decodeIfPresent(String.self, forKey: .milestone_labels)
                ?? c.decodeIfPresent(String.self, forKey: .milestoneLabels)
                ?? "[\"Placed\",\"Preparing\",\"On the way\",\"Delivered\"]"
        }

        func encode(to encoder: Encoder) throws {
            var c = encoder.container(keyedBy: CodingKeys.self)
            try c.encode(message1, forKey: .message1)
            try c.encode(message2, forKey: .message2)
            try c.encode(message3, forKey: .message3)
            try c.encode(message1FontSize, forKey: .message1FontSize)
            try c.encode(message1FontColorHex, forKey: .message1FontColorHex)
            try c.encode(line1_font_text_styles, forKey: .line1_font_text_styles)
            try c.encode(message2FontSize, forKey: .message2FontSize)
            try c.encode(message2FontColorHex, forKey: .message2FontColorHex)
            try c.encode(line2_font_text_styles, forKey: .line2_font_text_styles)
            try c.encode(message3FontSize, forKey: .message3FontSize)
            try c.encode(message3FontColorHex, forKey: .message3FontColorHex)
            try c.encode(line3_font_text_styles, forKey: .line3_font_text_styles)
            try c.encode(backgroundColorHex, forKey: .backgroundColorHex)
            try c.encode(fontColorHex, forKey: .fontColorHex)
            try c.encode(progressColorHex, forKey: .progressColorHex)
            try c.encode(fontSize, forKey: .fontSize)
            try c.encode(progressPercent, forKey: .progressPercent)
            try c.encode(align, forKey: .align)
            try c.encode(bg_color_gradient, forKey: .bg_color_gradient)
            try c.encode(bg_color_gradient_dir, forKey: .bg_color_gradient_dir)
            try c.encodeIfPresent(imageFileName, forKey: .imageFileName)
            try c.encodeIfPresent(imageUrl, forKey: .imageUrl)
            try c.encodeIfPresent(logoFileName, forKey: .logoFileName)
            try c.encodeIfPresent(logoUrl, forKey: .logoUrl)
            try c.encode(deliveryState, forKey: .deliveryState)
            try c.encode(deliveryUi, forKey: .deliveryUi)
            try c.encode(milestoneStep, forKey: .milestoneStep)
            try c.encode(milestoneTotal, forKey: .milestoneTotal)
            try c.encode(milestoneLabelsJson, forKey: .milestoneLabelsJson)
        }
    }
}

// MARK: - Live Activity Widget
@available(iOS 16.2, *)
struct DeliveryActivityLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: DeliveryActivityAttributes.self) { context in
            if shouldUseDeliveryTrackingUi(context.state) {
                deliveryTrackingLockScreen(context: context)
            } else {
                legacyLockScreen(context: context)
            }
        } dynamicIsland: { context in
            deliveryTrackingDynamicIsland(context: context)
        }
    }

    private func shouldUseDeliveryTrackingUi(_ state: DeliveryActivityAttributes.ContentState) -> Bool {
        if state.deliveryUi.lowercased() == "v2" { return true }
        return !state.deliveryState.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    @ViewBuilder
    private func deliveryTrackingLockScreen(context: ActivityViewContext<DeliveryActivityAttributes>) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                merchantLogoView(
                    fileName: context.state.logoFileName,
                    remoteUrl: context.state.logoUrl,
                    size: 36
                )
                Text(context.state.message1)
                    .font(.system(size: context.state.message1FontSize, weight: .bold))
                    .foregroundColor(colorFromHex(context.state.message1FontColorHex))
                    .lineLimit(1)
                Spacer(minLength: 0)
            }

            Text(context.state.message2)
                .font(.system(size: context.state.message2FontSize))
                .foregroundColor(colorFromHex(context.state.message2FontColorHex))
                .lineLimit(2)

            Text(context.state.message3)
                .font(.system(size: max(context.state.message3FontSize, 18), weight: .semibold))
                .foregroundColor(colorFromHex(context.state.message3FontColorHex))
                .lineLimit(2)

            MilestoneIconRowView(
                step: context.state.milestoneStep,
                total: max(context.state.milestoneTotal, 1),
                labels: parseMilestoneLabels(context.state.milestoneLabelsJson),
                activeColor: colorFromHex(context.state.progressColorHex),
                inactiveColor: colorFromHex(context.state.progressColorHex).opacity(0.25),
                labelColor: colorFromHex(context.state.message2FontColorHex)
            )
            .frame(height: 52)

            if appGroupImageExists(context.state.imageFileName),
               let img = loadImageFromAppGroup(named: context.state.imageFileName ?? "") {
                img
                    .resizable()
                    .scaledToFill()
                    .frame(maxWidth: .infinity)
                    .frame(height: 88)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else if let urlString = context.state.imageUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
                      !urlString.isEmpty,
                      let url = URL(string: urlString) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        Color.white.opacity(0.08)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: 88)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
        .padding()
        .background(backgroundView(for: context.state))
        .activityBackgroundTint(colorFromHex(context.state.backgroundColorHex))
        .activitySystemActionForegroundColor(colorFromHex(context.state.fontColorHex))
        .environment(\.layoutDirection, context.state.align == "right" ? .rightToLeft : .leftToRight)
    }

    @ViewBuilder
    private func legacyLockScreen(context: ActivityViewContext<DeliveryActivityAttributes>) -> some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: 6) {
                styledLine(
                    text: context.state.message1,
                    fontSize: context.state.message1FontSize,
                    colorHex: context.state.message1FontColorHex,
                    styles: context.state.line1_font_text_styles
                )
                styledLine(
                    text: context.state.message2,
                    fontSize: context.state.message2FontSize,
                    colorHex: context.state.message2FontColorHex,
                    styles: context.state.line2_font_text_styles
                )
                styledLine(
                    text: context.state.message3,
                    fontSize: context.state.message3FontSize,
                    colorHex: context.state.message3FontColorHex,
                    styles: context.state.line3_font_text_styles
                )

                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Capsule()
                            .fill(Color.gray.opacity(0.2))
                            .frame(height: 6)
                        Capsule()
                            .fill(colorFromHex(context.state.progressColorHex))
                            .frame(width: geometry.size.width * CGFloat(context.state.progressPercent), height: 6)
                    }
                }
                .frame(height: 6)
            }

            if appGroupImageExists(context.state.imageFileName) {
                Spacer(minLength: 8)
                liveActivityArtwork(
                    imageFileName: context.state.imageFileName,
                    width: 88,
                    height: 56,
                    cornerRadius: 10
                )
            }
        }
        .padding()
        .background(backgroundView(for: context.state))
        .activityBackgroundTint(colorFromHex(context.state.backgroundColorHex))
        .activitySystemActionForegroundColor(colorFromHex(context.state.fontColorHex))
        .environment(\.layoutDirection, context.state.align == "right" ? .rightToLeft : .leftToRight)
    }

    @ViewBuilder
    private func styledLine(text: String, fontSize: Double, colorHex: String, styles: [String]) -> some View {
        let weight: Font.Weight = styles.contains("bold") ? .bold : .regular
        let base = Text(text)
            .font(.system(size: fontSize, weight: weight))
            .foregroundColor(colorFromHex(colorHex))
            .modifier(TextStyleModifier(styles: styles))
        if styles.contains("italic") {
            base.italic()
        } else {
            base
        }
    }

    @ViewBuilder
    private func merchantLogoView(fileName: String?, remoteUrl: String?, size: CGFloat) -> some View {
        if appGroupImageExists(fileName), let img = loadImageFromAppGroup(named: fileName ?? "") {
            img
                .resizable()
                .scaledToFill()
                .frame(width: size, height: size)
                .clipShape(Circle())
        } else if let urlString = remoteUrl?.trimmingCharacters(in: .whitespacesAndNewlines),
                  !urlString.isEmpty,
                  let url = URL(string: urlString) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFill()
                default:
                    Circle().fill(Color.white.opacity(0.15))
                }
            }
            .frame(width: size, height: size)
            .clipShape(Circle())
        } else {
            Circle()
                .fill(Color.white.opacity(0.15))
                .frame(width: size, height: size)
                .overlay(
                    Image(systemName: "bag.fill")
                        .font(.system(size: size * 0.45))
                        .foregroundColor(colorFromHex("#FFFFFF").opacity(0.8))
                )
        }
    }

    private func deliveryTrackingDynamicIsland(context: ActivityViewContext<DeliveryActivityAttributes>) -> DynamicIsland {
        DynamicIsland {
            DynamicIslandExpandedRegion(.leading) {
                merchantLogoView(
                    fileName: context.state.logoFileName,
                    remoteUrl: context.state.logoUrl,
                    size: 28
                )
            }
            DynamicIslandExpandedRegion(.trailing) {
                Text(context.state.message3)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(colorFromHex(context.state.message3FontColorHex))
                    .lineLimit(1)
            }
            DynamicIslandExpandedRegion(.bottom) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(context.state.message1)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(colorFromHex(context.state.message1FontColorHex))
                    Text(context.state.message2)
                        .font(.caption2)
                        .foregroundColor(colorFromHex(context.state.message2FontColorHex))
                    MilestoneIconRowView(
                        step: context.state.milestoneStep,
                        total: max(context.state.milestoneTotal, 1),
                        labels: parseMilestoneLabels(context.state.milestoneLabelsJson),
                        activeColor: colorFromHex(context.state.progressColorHex),
                        inactiveColor: colorFromHex(context.state.progressColorHex).opacity(0.25),
                        labelColor: colorFromHex(context.state.message2FontColorHex)
                    )
                    .frame(height: 40)
                }
            }
        } compactLeading: {
            merchantLogoView(
                fileName: context.state.logoFileName,
                remoteUrl: context.state.logoUrl,
                size: 22
            )
        } compactTrailing: {
            if shouldUseDeliveryTrackingUi(context.state) {
                Text(parseMilestoneLabels(context.state.milestoneLabelsJson)[safe: context.state.milestoneStep - 1] ?? "Step \(context.state.milestoneStep)")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(colorFromHex(context.state.fontColorHex))
                    .lineLimit(1)
            } else {
                Text("\(Int(context.state.progressPercent * 100))%")
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .foregroundColor(colorFromHex(context.state.fontColorHex))
            }
        } minimal: {
            Image(systemName: milestoneIconName(at: max(context.state.milestoneStep - 1, 0)))
                .foregroundColor(colorFromHex(context.state.fontColorHex))
        }
        .keylineTint(colorFromHex(context.state.progressColorHex))
    }
}

// MARK: - Milestone icons (Phase 3)

private let defaultMilestoneIcons = ["bag.fill", "fork.knife", "bicycle", "house.fill"]

private func parseMilestoneLabels(_ json: String) -> [String] {
    guard let data = json.data(using: .utf8),
          let decoded = try? JSONDecoder().decode([String].self, from: data),
          !decoded.isEmpty else {
        return ["Placed", "Preparing", "On the way", "Delivered"]
    }
    return decoded
}

private func milestoneIconName(at index: Int) -> String {
    guard index >= 0, index < defaultMilestoneIcons.count else {
        return defaultMilestoneIcons.last ?? "house.fill"
    }
    return defaultMilestoneIcons[index]
}

private struct MilestoneIconRowView: View {
    let step: Int
    let total: Int
    let labels: [String]
    let activeColor: Color
    let inactiveColor: Color
    let labelColor: Color

    var body: some View {
        let safeTotal = max(total, 1)
        let safeStep = min(max(step, 0), safeTotal)

        HStack(spacing: 0) {
            ForEach(0..<safeTotal, id: \.self) { index in
                HStack(spacing: 0) {
                    VStack(spacing: 4) {
                        ZStack {
                            Circle()
                                .fill(index < safeStep ? activeColor : inactiveColor)
                                .frame(width: 28, height: 28)
                            Image(systemName: milestoneIconName(at: index))
                                .font(.system(size: 12, weight: .semibold))
                                .foregroundColor(.white.opacity(index < safeStep ? 1 : 0.7))
                        }
                        Text(labels[safe: index] ?? "")
                            .font(.system(size: 9))
                            .foregroundColor(labelColor.opacity(index < safeStep ? 1 : 0.55))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .frame(maxWidth: .infinity)

                    if index < safeTotal - 1 {
                        Rectangle()
                            .fill(index < safeStep - 1 ? activeColor : inactiveColor)
                            .frame(height: 2)
                            .frame(maxWidth: .infinity)
                            .padding(.bottom, 14)
                    }
                }
            }
        }
    }
}

private extension Array {
    subscript(safe index: Int) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

// MARK: - Milestone progress (legacy segmented bar)

private struct MilestoneProgressView: View {
    let step: Int
    let total: Int
    let activeColor: Color
    let inactiveColor: Color

    var body: some View {
        GeometryReader { geo in
            let safeTotal = max(total, 1)
            let safeStep = min(max(step, 0), safeTotal)
            let gap: CGFloat = 3
            let segmentWidth = (geo.size.width - gap * CGFloat(safeTotal - 1)) / CGFloat(safeTotal)

            HStack(spacing: gap) {
                ForEach(0..<safeTotal, id: \.self) { index in
                    Capsule()
                        .fill(index < safeStep ? activeColor : inactiveColor)
                        .frame(width: segmentWidth, height: geo.size.height)
                }
            }
        }
    }
}

private func appGroupImageExists(_ fileName: String?) -> Bool {
    guard let name = fileName, !name.isEmpty,
          let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.meheryeventsender.example.NotificationLiveActivity"
          ) else {
        return false
    }
    let path = containerURL.appendingPathComponent(name).path
    return FileManager.default.fileExists(atPath: path)
}

func loadImageFromAppGroup(named name: String) -> Image? {
    guard let containerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: "group.meheryeventsender.example.NotificationLiveActivity") else {
        print("❌ App Group container not found")
        return nil
    }

    let fileURL = containerURL.appendingPathComponent(name)
    print("📂 Looking for image at path: \(fileURL.path)")

    guard FileManager.default.fileExists(atPath: fileURL.path) else {
        print("❌ File does not exist at path: \(fileURL.path)")
        return nil
    }

    guard let uiImage = UIImage(contentsOfFile: fileURL.path) else {
        print("❌ Failed to load UIImage from file: \(fileURL.path)")
        return nil
    }

    print("✅ Successfully loaded image: \(name)")
    return Image(uiImage: uiImage)
}

@ViewBuilder
private func liveActivityArtwork(
    imageFileName: String?,
    width: CGFloat,
    height: CGFloat,
    cornerRadius: CGFloat
) -> some View {
    if let img = loadImageFromAppGroup(named: imageFileName ?? "") {
        img
            .resizable()
            .scaledToFill()
            .frame(width: width, height: height)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
    } else {
        Color.clear
            .frame(width: width, height: height)
    }
}



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
    case "toleft", "left":
        return (.trailing, .leading)      // Gradient moves from right to left
    case "toright", "right":
        return (.leading, .trailing)      // Gradient moves from left to right
    case "totop", "top":
        return (.bottom, .top)            // Gradient moves from bottom to top
    case "tobottom", "bottom":
        return (.top, .bottom)            // Gradient moves from top to bottom
    case "horizontal":
        return (.leading, .trailing)      // Left → Right
    case "vertical":
        return (.top, .bottom)            // Top → Bottom
    default:
        return (.top, .bottom)            // Default vertical
    }
}


// MARK: - Text Style Modifier

struct TextStyleModifier: ViewModifier {
    let styles: [String]
    
    func body(content: Content) -> some View {
        let _ = print("🎨 TextStyleModifier called with styles: \(styles)")
        let _ = print("🎨 Contains underline: \(styles.contains("underline"))")
        
        if #available(iOS 16.0, *) {
            return content
                .underline(styles.contains("underline"))
        } else {
            return content
        }
    }
}

// MARK: - Helpers

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
            message1FontSize: 20,
            message1FontColorHex: "#FFFFFF",
            line1_font_text_styles: ["bold"],
            message2FontSize: 16,
            message2FontColorHex: "#FFFF00",
            line2_font_text_styles: ["italic"],
            message3FontSize: 14,
            message3FontColorHex: "#00FF00",
            line3_font_text_styles: ["underline"],
            backgroundColorHex: "#FFFFFF",
            fontColorHex: "#FFFFFF",
            progressColorHex: "#FFFFFF",
            fontSize: 14,
            progressPercent: 0.5,// 50% progress
            align: "left",
            bg_color_gradient: "#080000",
            bg_color_gradient_dir: "toRight",
            imageFileName: nil,
            imageUrl: nil,
            logoFileName: nil,
            logoUrl: nil,
            deliveryState: "preparing",
            deliveryUi: "v2",
            milestoneStep: 1,
            milestoneTotal: 4,
            milestoneLabelsJson: "[\"Placed\",\"Preparing\",\"On the way\",\"Delivered\"]"
        )
    }
}

@available(iOS 18.0, *)
#Preview("Live Activity", as: .content, using: DeliveryActivityAttributes.preview) {
    DeliveryActivityLiveActivity()
} contentStates: {
    DeliveryActivityAttributes.ContentState.preview
}

