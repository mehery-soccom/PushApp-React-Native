import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension, UIScrollViewDelegate {

    // MARK: - Outlets
    @IBOutlet weak var containerView: UIView!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var textLabel: UILabel!
    @IBOutlet weak var logoImageView: UIImageView! // New outlet for logo

    // MARK: - Properties
    private var images: [UIImage] = []
    private var currentIndex: Int = 0
    private var autoScrollTimer: Timer?
    private var notification: UNNotification?
    private var carouselNeedsBuild = false

    // NEW VIEWS (carousel with partial peek)
    private let carouselView = UIView()
    private let carouselScrollView = UIScrollView()
    private var carouselImageViews: [UIImageView] = []
    private let pageControl = UIPageControl()

    // Constraints for dynamic updating
    private var carouselLeadingConstraint: NSLayoutConstraint?
    private var carouselTrailingConstraint: NSLayoutConstraint?
    private var carouselTopConstraint: NSLayoutConstraint?
    private var carouselHeightConstraint: NSLayoutConstraint?

    private let styledTitleKeys = ["name", "template_name", "styled_name", "styled_title", "title"]
    private let styledBodyKeys = ["message", "styled_message", "styled_body", "body", "description"]
    private let styledLogoKeys = ["styled_image", "styledImage", "logo_url", "logoUrl", "logo", "icon", "icon_url", "iconUrl"]

    // ---------------------------------------------------------
    // MARK: - viewDidLoad
    // ---------------------------------------------------------
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .clear
        containerView.backgroundColor = UIColor(red: 0.11, green: 0.11, blue: 0.13, alpha: 0.98)
        containerView.layer.cornerRadius = 16
        containerView.clipsToBounds = true
        containerView.layer.cornerCurve = .continuous

        titleLabel.textColor = .white
        textLabel.textColor = UIColor(white: 0.88, alpha: 1)
        titleLabel.numberOfLines = 2
        textLabel.numberOfLines = 3
        textLabel.backgroundColor = .clear
        titleLabel.backgroundColor = .clear
        titleLabel.font = UIFont.systemFont(ofSize: 17, weight: .semibold)
        textLabel.font = UIFont.systemFont(ofSize: 14, weight: .regular)

        logoImageView.contentMode = .scaleAspectFit
        logoImageView.clipsToBounds = true
        logoImageView.layer.cornerRadius = 6
        logoImageView.layer.masksToBounds = true

        setupCarouselViews()
        setupGestures()
    }

   // ---------------------------------------------------------
// MARK: - Layout Size (Optimized)
// ---------------------------------------------------------
override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()

    if carouselNeedsBuild, !images.isEmpty, carouselView.bounds.width > 0 {
        carouselNeedsBuild = false
        buildCarouselScrollContent()
    }

    view.layoutIfNeeded()

    let width = max(view.bounds.width, 1)
    let height: CGFloat
    if !images.isEmpty, carouselView.superview != nil, carouselView.bounds.width > 0 {
        // Use the real laid-out bottom edge; round down to avoid a sub-pixel strip below the media.
        let carouselBottomInView = containerView.convert(
            CGPoint(x: 0, y: carouselView.frame.maxY),
            to: view
        ).y
        height = max(floor(carouselBottomInView * UIScreen.main.scale) / UIScreen.main.scale, 1)
    } else {
        let headerBottom = max(
            logoImageView.frame.maxY,
            textLabel.isHidden ? titleLabel.frame.maxY : textLabel.frame.maxY
        )
        let headerBottomInView = containerView.convert(
            CGPoint(x: 0, y: headerBottom),
            to: view
        ).y
        height = max(headerBottomInView + 12, 1)
    }

    preferredContentSize = CGSize(width: width, height: height)
}


private var isCarouselEnabled: Bool {
    return images.count > 1
}


    // ---------------------------------------------------------
    // MARK: - Receive Notification
    // ---------------------------------------------------------
    func didReceive(_ notification: UNNotification) {
    self.notification = notification
    let userInfo = notification.request.content.userInfo

    titleLabel.text = preferredText(
        keys: styledTitleKeys,
        userInfo: userInfo,
        fallback: notification.request.content.title
    )
    textLabel.text = preferredText(
        keys: styledBodyKeys,
        userInfo: userInfo,
        fallback: notification.request.content.body
    )

    // ---------------------------------------------------------
    // ✅ 1. LOAD LOGO FROM ATTACHMENT (if exists)
    // ---------------------------------------------------------
    if let logoAttachment = notification.request.content.attachments.first(where: { $0.identifier == "logo" }) {
    _ = logoAttachment.url.startAccessingSecurityScopedResource()
    if let data = try? Data(contentsOf: logoAttachment.url) {
        logoImageView.image = UIImage(data: data)
        print("🟦 Loaded remote logo")
    }
    logoAttachment.url.stopAccessingSecurityScopedResource()
}

// (B) Fallback to local asset
if logoImageView.image == nil {
    if let styledLogoUrl = preferredUrl(keys: styledLogoKeys, userInfo: userInfo) {
        URLSession.shared.dataTask(with: styledLogoUrl) { [weak self] data, _, _ in
            guard let self = self,
                  let data = data,
                  let image = UIImage(data: data) else { return }
            DispatchQueue.main.async {
                self.logoImageView.image = image
                self.logoImageView.contentMode = .scaleAspectFit
                self.logoImageView.backgroundColor = .clear
            }
        }.resume()
    } else {
        logoImageView.image = UIImage(named: "logo")
        print("🔵 Fallback local logo loaded:", UIImage(named: "logo") != nil)
    }
    
    // (C) Final Fallback to system icon
    if logoImageView.image == nil {
        logoImageView.image = UIImage(systemName: "app.badge") ?? UIImage(systemName: "bell.fill")
        logoImageView.tintColor = .white
        logoImageView.contentMode = .center
        logoImageView.backgroundColor = UIColor(white: 0.2, alpha: 1)
        print("⚪️ Used system fallback for logo")
    }
}
    // Hide body label if empty
    let isBodyEmpty = (textLabel.text ?? "")
        .trimmingCharacters(in: .whitespacesAndNewlines)
        .isEmpty
    textLabel.isHidden = isBodyEmpty

    // Apply layout update
    view.setNeedsLayout()
    view.layoutIfNeeded()

    // ---------------------------------------------------------
    // ---------------------------------------------------------
    // ✅ 2. LOAD CAROUSEL IMAGES (Asynchronously)
    // ---------------------------------------------------------
    images.removeAll()
    
    let attachments = notification.request.content.attachments

    DispatchQueue.global(qos: .userInitiated).async { [weak self] in
        var loadedImages: [UIImage] = []
        
        for attachment in attachments {
            // Skip the logo (identifier == "logo")
            if attachment.identifier == "logo" { continue }

            _ = attachment.url.startAccessingSecurityScopedResource()
            if let data = try? Data(contentsOf: attachment.url),
               let img = UIImage(data: data) {
                loadedImages.append(img)
            }
            attachment.url.stopAccessingSecurityScopedResource()
        }
        
        DispatchQueue.main.async {
            guard let self = self else { return }
            self.images = loadedImages
            
            // ---------------------------------------------------------
            // ✅ 3. START CAROUSEL IF IMAGES EXIST
            // ---------------------------------------------------------
            if !self.images.isEmpty {
                self.currentIndex = 0
                self.carouselNeedsBuild = true
                self.pageControl.numberOfPages = self.images.count
                self.pageControl.currentPage = 0
                self.pageControl.isHidden = !self.isCarouselEnabled

                // Update constraints based on new count
                let hPadding: CGFloat = self.isCarouselEnabled ? 16 : 0
                self.carouselLeadingConstraint?.constant = hPadding
                self.carouselTrailingConstraint?.constant = -hPadding
                self.carouselTopConstraint?.constant = hPadding > 0 ? 16 : 20

                self.updateCarouselHeightConstraintForLoadedImages()

                if self.isCarouselEnabled {
                    self.startAutoScroll()
                    self.carouselView.isUserInteractionEnabled = true
                } else {
                    self.autoScrollTimer?.invalidate()
                    self.carouselView.isUserInteractionEnabled = false
                }
                
                // Final layout pass after images are loaded
                self.view.setNeedsLayout()
                self.view.layoutIfNeeded()
            } else {
                self.carouselHeightConstraint = nil
                self.carouselView.removeFromSuperview()
                self.pageControl.removeFromSuperview()

                // Layout again to shrink height correctly
                self.view.setNeedsLayout()
                self.view.layoutIfNeeded()
            }
        }
    }
}

    /// Replaces the fixed 0.7 height with the image aspect ratio so `scaleAspectFit` does not
    /// letterbox (dark band) above/below the photo inside the carousel.
    private func updateCarouselHeightConstraintForLoadedImages() {
        guard !images.isEmpty, carouselView.superview != nil else { return }

        let ratio: CGFloat
        if images.count == 1 {
            let img = images[0]
            let iw = max(img.size.width, 1)
            ratio = min(max(img.size.height / iw, 0.28), 1.3)
        } else {
            let maxR = images.map { $0.size.height / max($0.size.width, 1) }.max() ?? 0.7
            ratio = min(max(maxR, 0.34), 0.95)
        }

        carouselHeightConstraint?.isActive = false
        let next = carouselView.heightAnchor.constraint(equalTo: carouselView.widthAnchor, multiplier: ratio)
        next.priority = .required
        next.isActive = true
        carouselHeightConstraint = next
    }

    // ---------------------------------------------------------
    // MARK: - Build Carousel Scroll (partial peek)
    // ---------------------------------------------------------
    private func buildCarouselScrollContent() {
        carouselImageViews.forEach { $0.removeFromSuperview() }
        carouselImageViews.removeAll()

        guard !images.isEmpty else { return }

        let isCarousel = images.count > 1
        let pageWidthRatio: CGFloat = isCarousel ? 0.85 : 1.0
        let peekRatio: CGFloat = isCarousel ? (1 - pageWidthRatio) / 2 : 0.0
        
        let w = max(carouselView.bounds.width, containerView.bounds.width, 1)
        let pageWidth = w * pageWidthRatio
        
        for (index, img) in images.enumerated() {
            let iv = UIImageView(image: img)
            iv.contentMode = .scaleAspectFit
            iv.clipsToBounds = true
            iv.backgroundColor = UIColor(white: 0.08, alpha: 1.0)
            iv.translatesAutoresizingMaskIntoConstraints = false
            carouselScrollView.addSubview(iv)
            carouselImageViews.append(iv)

            let isLast = index == images.count - 1
            let thisWidth = (isCarousel && isLast) ? w : pageWidth

            NSLayoutConstraint.activate([
                iv.topAnchor.constraint(equalTo: carouselScrollView.topAnchor),
                iv.bottomAnchor.constraint(equalTo: carouselScrollView.bottomAnchor),
                iv.widthAnchor.constraint(equalToConstant: thisWidth),
                iv.leadingAnchor.constraint(
                    equalTo: index == 0 ? carouselScrollView.leadingAnchor : carouselImageViews[index - 1].trailingAnchor,
                    constant: 0
                )
            ])
        }

        view.layoutIfNeeded()

        let totalWidth = isCarousel ? (CGFloat(images.count - 1) * pageWidth + w) : w
        let inset = w * peekRatio
        carouselScrollView.contentInset = UIEdgeInsets(top: 0, left: inset, bottom: 0, right: inset)
        carouselScrollView.contentSize = CGSize(width: totalWidth, height: carouselView.bounds.height > 0 ? carouselView.bounds.height : w * 0.7)
        scrollToPage(currentIndex, animated: false)
    }

    private func preferredText(
        keys: [String],
        userInfo: [AnyHashable: Any],
        fallback: String
    ) -> String {
        for key in keys {
            if let value = stringValue(for: key, userInfo: userInfo), !value.isEmpty {
                return value
            }
        }
        return fallback
    }

    private func preferredUrl(keys: [String], userInfo: [AnyHashable: Any]) -> URL? {
        for key in keys {
            guard let value = stringValue(for: key, userInfo: userInfo), !value.isEmpty else { continue }
            if let url = URL(string: value) {
                return url
            }
        }
        return nil
    }

    private func stringValue(for key: String, userInfo: [AnyHashable: Any]) -> String? {
        if let value = userInfo[key] as? String {
            return value.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        if let value = userInfo[key] as? NSString {
            return value.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        return nil
    }

    private func scrollToPage(_ index: Int, animated: Bool) {
        guard index >= 0, index < images.count else { return }
        let isCarousel = images.count > 1
        let w = max(carouselView.bounds.width, containerView.bounds.width, 1)
        let pageWidth = isCarousel ? w * 0.85 : w
        let inset = isCarousel ? w * 0.075 : 0.0
        let offset = CGFloat(index) * pageWidth - inset
        carouselScrollView.setContentOffset(CGPoint(x: max(-inset, offset), y: 0), animated: animated)
        currentIndex = index
        pageControl.currentPage = index
    }


    // ---------------------------------------------------------
    // MARK: - Setup Carousel Views (with partial peek of adjacent images)
    // ---------------------------------------------------------
    private func setupCarouselViews() {
        carouselView.translatesAutoresizingMaskIntoConstraints = false
        carouselView.clipsToBounds = false
        containerView.addSubview(carouselView)

        carouselView.layer.cornerRadius = 14
        carouselView.clipsToBounds = true
        carouselView.layer.cornerCurve = .continuous

        carouselScrollView.translatesAutoresizingMaskIntoConstraints = false
        carouselScrollView.showsHorizontalScrollIndicator = false
        carouselScrollView.isPagingEnabled = false
        carouselScrollView.delegate = self
        carouselScrollView.clipsToBounds = true
        carouselView.addSubview(carouselScrollView)

        pageControl.translatesAutoresizingMaskIntoConstraints = false
        pageControl.currentPageIndicatorTintColor = .white
        pageControl.pageIndicatorTintColor = UIColor.white.withAlphaComponent(0.35)
        pageControl.hidesForSinglePage = true
        pageControl.isUserInteractionEnabled = false
        containerView.addSubview(pageControl)

        // Dynamic padding: 0 for single image (full bleeds to container), 16 for carousel
        let hPadding: CGFloat = 0 // Default to 0, will update in didReceive
        
        let leading = carouselView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: hPadding)
        let trailing = carouselView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -hPadding)
        let top = carouselView.topAnchor.constraint(equalTo: textLabel.bottomAnchor, constant: 20)
        
        carouselLeadingConstraint = leading
        carouselTrailingConstraint = trailing
        carouselTopConstraint = top
        
        let heightC = carouselView.heightAnchor.constraint(equalTo: carouselView.widthAnchor, multiplier: 0.7)
        carouselHeightConstraint = heightC

        NSLayoutConstraint.activate([
            leading, trailing, top,
            heightC,

            carouselScrollView.leadingAnchor.constraint(equalTo: carouselView.leadingAnchor),
            carouselScrollView.trailingAnchor.constraint(equalTo: carouselView.trailingAnchor),
            carouselScrollView.topAnchor.constraint(equalTo: carouselView.topAnchor),
            carouselScrollView.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor),

            pageControl.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor, constant: -4),
            pageControl.centerXAnchor.constraint(equalTo: carouselView.centerXAnchor)
        ])
    }

    // ---------------------------------------------------------
    // MARK: - Gestures
    // ---------------------------------------------------------
    private func setupGestures() {
        let left = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
        left.direction = .left
        let right = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
        right.direction = .right
        carouselView.addGestureRecognizer(left)
        carouselView.addGestureRecognizer(right)
        carouselView.isUserInteractionEnabled = false
    }

    // ---------------------------------------------------------
    // MARK: - Auto Scroll
    // ---------------------------------------------------------
    private func startAutoScroll() {
        autoScrollTimer?.invalidate()
        autoScrollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
            self?.animateForward()
        }
    }

    private func animateForward() {
        guard isCarouselEnabled, !images.isEmpty else { return }
        let nextIndex = (currentIndex + 1) % images.count
        scrollToPage(nextIndex, animated: true)
    }

    private func animateBackward() {
        guard isCarouselEnabled, !images.isEmpty else { return }
        let prevIndex = (currentIndex - 1 + images.count) % images.count
        scrollToPage(prevIndex, animated: true)
    }

    @objc private func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
        guard isCarouselEnabled else { return }
        autoScrollTimer?.invalidate()
        if gesture.direction == .left { animateForward() }
        else if gesture.direction == .right { animateBackward() }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in self?.startAutoScroll() }
    }

    func scrollViewDidEndDecelerating(_ scrollView: UIScrollView) {
        let w = max(carouselView.bounds.width, containerView.bounds.width, 1)
        let pageWidth = w * 0.85
        let inset = w * 0.075
        let page = Int(round((scrollView.contentOffset.x + inset) / pageWidth))
        currentIndex = max(0, min(page, images.count - 1))
        pageControl.currentPage = currentIndex
        autoScrollTimer?.invalidate()
        startAutoScroll()
    }

    func scrollViewWillEndDragging(_ scrollView: UIScrollView, withVelocity velocity: CGPoint, targetContentOffset: UnsafeMutablePointer<CGPoint>) {
        let w = max(carouselView.bounds.width, containerView.bounds.width, 1)
        let pageWidth = w * 0.85
        let inset = w * 0.075
        let page = Int(round((targetContentOffset.pointee.x + inset) / pageWidth))
        let clamped = max(0, min(page, images.count - 1))
        targetContentOffset.pointee.x = CGFloat(clamped) * pageWidth - inset
    }

    // ---------------------------------------------------------
    // MARK: - Notification Action Buttons
    // ---------------------------------------------------------
    func didReceive(
        _ response: UNNotificationResponse,
        completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void
    ) {
        let actionId = response.actionIdentifier
        let userInfo = response.notification.request.content.userInfo

        switch actionId {
        case "PUSHAPP_NEXT":
            autoScrollTimer?.invalidate()
            animateForward()
            completion(.doNotDismiss)

        case "PUSHAPP_PREVIOUS":
            autoScrollTimer?.invalidate()
            animateBackward()
            completion(.doNotDismiss)

        case "PUSHAPP_OPT_IN", "PUSHAPP_NOT_INTERESTED":
            if let url = urlForAction(actionId, userInfo: userInfo) {
                extensionContext?.open(url, completionHandler: { _ in 
                    completion(.dismiss)
                })
            } else {
                completion(.dismissAndForwardAction)
            }

        default:
            if let url = urlForAction(actionId, userInfo: userInfo) {
                extensionContext?.open(url, completionHandler: { _ in
                    completion(.dismiss)
                })
            } else {
                completion(.dismissAndForwardAction)
            }
        }
    }

    private func mergedNotificationFields(_ userInfo: [AnyHashable: Any]) -> [String: Any] {
        var merged: [String: Any] = [:]
        for (k, v) in userInfo {
            merged[String(describing: k)] = v
        }
        if let dataDict = userInfo["data"] as? [AnyHashable: Any] {
            for (k, v) in dataDict {
                merged[String(describing: k)] = v
            }
        } else if let dataStr = userInfo["data"] as? String,
                  let d = dataStr.data(using: .utf8),
                  let obj = try? JSONSerialization.jsonObject(with: d) as? [String: Any] {
            for (k, v) in obj { merged[k] = v }
        }
        return merged
    }

    private func stringFromAny(_ value: Any?) -> String? {
        guard let value else { return nil }
        if let s = value as? String { return s }
        if let s = value as? NSString { return s as String }
        if let n = value as? NSNumber { return n.stringValue }
        return nil
    }

    private func urlStringFromButtonDict(_ button: [String: Any]) -> String? {
        let urlKeys = [
            "url", "link", "href", "deepLink", "deeplink",
            "targetUrl", "target_url", "action_url", "cta_url"
        ]
        for key in urlKeys {
            if let s = stringFromAny(button[key])?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty {
                return s
            }
        }
        return nil
    }

    private func parseCtaButtonsArray(_ raw: Any?) -> [[String: Any]]? {
        guard let raw else { return nil }
        if let arr = raw as? [[String: Any]] { return arr }
        if let arr = raw as? [Any] {
            return arr.compactMap { item -> [String: Any]? in
                if let d = item as? [String: Any] { return d }
                if let d = item as? [AnyHashable: Any] {
                    var out: [String: Any] = [:]
                    for (k, v) in d {
                        out[String(describing: k)] = v
                    }
                    return out
                }
                return nil
            }
        }
        if let s = raw as? String, let data = s.data(using: .utf8),
           let json = try? JSONSerialization.jsonObject(with: data) {
            return parseCtaButtonsArray(json)
        }
        return nil
    }

    private func parseActionUrlsMap(_ raw: Any?) -> [String: String]? {
        guard let raw else { return nil }
        if let dict = raw as? [String: String] { return dict }
        if let dict = raw as? [String: Any] {
            var out: [String: String] = [:]
            for (k, v) in dict {
                if let s = stringFromAny(v) { out[k] = s }
            }
            return out
        }
        if let s = raw as? String, let data = s.data(using: .utf8),
           let obj = try? JSONSerialization.jsonObject(with: data) {
            return parseActionUrlsMap(obj)
        }
        return nil
    }

    private func urlForAction(_ actionId: String, userInfo: [AnyHashable: Any]) -> URL? {
        if actionId == UNNotificationDefaultActionIdentifier || actionId == UNNotificationDismissActionIdentifier { return nil }

        let merged = mergedNotificationFields(userInfo)

        func str(_ key: String) -> String? { stringFromAny(merged[key]) }

        func validUrl(_ raw: String?) -> URL? {
            guard let raw else { return nil }
            let cleaned = raw.trimmingCharacters(in: .whitespacesAndNewlines)
            guard !cleaned.isEmpty else { return nil }
            guard let url = URL(string: cleaned),
                  let scheme = url.scheme?.lowercased(),
                  ["http", "https"].contains(scheme) || cleaned.contains("://") else {
                return nil
            }
            return url
        }
        func actionIndex(_ id: String) -> Int? {
            if id == "PUSHAPP_ACTION_1" || id == "PUSHAPP_OPT_IN" || id == "PUSHAPP_YES" { return 0 }
            if id == "PUSHAPP_ACTION_2" || id.hasSuffix("_MID") { return 1 }
            if id == "PUSHAPP_ACTION_3" || id == "PUSHAPP_NOT_INTERESTED" || id == "PUSHAPP_NO" { return 2 }
            if let number = Int(id.split(separator: "_").last ?? "") {
                return max(0, number - 1)
            }
            return nil
        }

        if let mapStr = stringFromAny(merged["__actionMap"]),
           let data = mapStr.data(using: .utf8),
           let map = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let url = validUrl(stringFromAny(map[actionId])) {
            return url
        }

        if let urls = parseActionUrlsMap(merged["action_urls"]),
           let url = validUrl(urls[actionId]) {
            return url
        }
        if actionId == "PUSHAPP_OPT_IN", let url = validUrl(str("url_opt_in")) { return url }
        if actionId == "PUSHAPP_NOT_INTERESTED", let url = validUrl(str("url_not_interested")) { return url }
        if actionId == "PUSHAPP_YES", let url = validUrl(str("url_yes") ?? str("url_opt_in")) { return url }
        if actionId == "PUSHAPP_NO", let url = validUrl(str("url_no") ?? str("url_not_interested")) { return url }
        if actionId.hasSuffix("_MID"),
           let url = validUrl(str("url_mid") ?? str("url_maybe") ?? str("url_action_2")) { return url }
        if let buttons = parseCtaButtonsArray(merged["cta_buttons"]) {
            if let index = actionIndex(actionId), buttons.indices.contains(index) {
                if let s = urlStringFromButtonDict(buttons[index]), let url = validUrl(s) { return url }
            }
            for btn in buttons {
                let bid = stringFromAny(btn["id"])
                if bid == actionId, let s = urlStringFromButtonDict(btn), let url = validUrl(s) { return url }
            }
        }
        if let index = actionIndex(actionId) {
            let keysByIndex = [
                ["url1", "cta1_url", "button1_url"],
                ["url2", "cta2_url", "button2_url"],
                ["url3", "cta3_url", "button3_url"]
            ]
            if keysByIndex.indices.contains(index) {
                for key in keysByIndex[index] {
                    if let url = validUrl(str(key)) { return url }
                }
            }
        }
        let actionSpecificKeys = [
            "url_\(actionId.lowercased())",
            "cta_url_\(actionId.lowercased())",
            "url_action_1", "url_action_2", "url_action_3"
        ]
        for key in actionSpecificKeys {
            if let url = validUrl(str(key)) { return url }
        }
        for key in ["cta_url", "url", "link", "click_action"] {
            if let url = validUrl(str(key)) { return url }
        }
        return nil
    }

}