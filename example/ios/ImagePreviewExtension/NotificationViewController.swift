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

    let hPadding: CGFloat = isCarouselEnabled ? 16 : 0
    let spacingAboveCarousel: CGFloat = images.isEmpty ? 0 : (hPadding > 0 ? 16 : 20)
    let carouselAspect: CGFloat = 0.7
    let carouselWidth = view.bounds.width - hPadding * 2
    let carouselHeight: CGFloat = images.isEmpty ? 0 : (carouselWidth * carouselAspect)
    let logoHeight = logoImageView.bounds.height
    let titleHeight = titleLabel.intrinsicContentSize.height
    let titleBlockHeight = max(logoHeight, titleHeight) + 10
    let bodyHeight = textLabel.isHidden ? 0 : textLabel.intrinsicContentSize.height + 6
    let pageControlHeight: CGFloat = 0 // overlapped with carousel
    let totalHeight =
        16 // top padding
        + titleBlockHeight
        + bodyHeight
        + spacingAboveCarousel
        + carouselHeight
        + pageControlHeight
        + 16 // bottom padding

    preferredContentSize = CGSize(width: view.bounds.width, height: totalHeight)
}


private var isCarouselEnabled: Bool {
    return images.count > 1
}


    // ---------------------------------------------------------
    // MARK: - Receive Notification
    // ---------------------------------------------------------
    func didReceive(_ notification: UNNotification) {
    self.notification = notification

    titleLabel.text = notification.request.content.title
    textLabel.text = notification.request.content.body

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
    logoImageView.image = UIImage(named: "logo")
    print("🔵 Fallback local logo loaded:", UIImage(named: "logo") != nil)
    
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
    let isBodyEmpty = notification.request.content.body
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

            let ext = attachment.url.pathExtension.lowercased()
            if ["png", "jpg", "jpeg"].contains(ext) {
                _ = attachment.url.startAccessingSecurityScopedResource()
                if let data = try? Data(contentsOf: attachment.url),
                   let img = UIImage(data: data) {
                    loadedImages.append(img)
                }
                attachment.url.stopAccessingSecurityScopedResource()
            }
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
                self.carouselView.removeFromSuperview()
                self.pageControl.removeFromSuperview()
                
                // Layout again to shrink height correctly
                self.view.setNeedsLayout()
                self.view.layoutIfNeeded()
            }
        }
    }
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
            iv.contentMode = .scaleAspectFill
            iv.clipsToBounds = true
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
        
        NSLayoutConstraint.activate([
            leading, trailing, top,
            carouselView.heightAnchor.constraint(equalTo: carouselView.widthAnchor, multiplier: 0.7),

            carouselScrollView.leadingAnchor.constraint(equalTo: carouselView.leadingAnchor),
            carouselScrollView.trailingAnchor.constraint(equalTo: carouselView.trailingAnchor),
            carouselScrollView.topAnchor.constraint(equalTo: carouselView.topAnchor),
            carouselScrollView.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor),

            pageControl.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor, constant: -8),
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

    private func urlForAction(_ actionId: String, userInfo: [AnyHashable: Any]) -> URL? {
        if actionId == UNNotificationDefaultActionIdentifier || actionId == UNNotificationDismissActionIdentifier { return nil }
        func str(_ key: String) -> String? { (userInfo[key] as? String) ?? (userInfo[key] as? NSString) as String? }

        if let urlsRaw = userInfo["action_urls"] {
            var urls: [String: String]?
            if let dict = urlsRaw as? [String: String] { urls = dict }
            else if let s = urlsRaw as? String, let data = s.data(using: .utf8),
                    let dict = try? JSONSerialization.jsonObject(with: data) as? [String: String] { urls = dict }
            if let urls = urls, let urlString = urls[actionId], let url = URL(string: urlString) { return url }
        }
        if actionId == "PUSHAPP_OPT_IN", let urlString = str("url_opt_in"), let url = URL(string: urlString) { return url }
        if actionId == "PUSHAPP_NOT_INTERESTED", let urlString = str("url_not_interested"), let url = URL(string: urlString) { return url }
        if actionId == "PUSHAPP_YES", let urlString = str("url_yes") ?? str("url_opt_in"), let url = URL(string: urlString) { return url }
        if actionId == "PUSHAPP_NO", let urlString = str("url_no") ?? str("url_not_interested"), let url = URL(string: urlString) { return url }
        if let buttonsRaw = userInfo["cta_buttons"] {
            var buttons: [[String: Any]]?
            if let arr = buttonsRaw as? [[String: Any]] { buttons = arr }
            else if let s = buttonsRaw as? String, let data = s.data(using: .utf8),
                    let arr = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] { buttons = arr }
            if let buttons = buttons {
                for btn in buttons {
                    if (btn["id"] as? String) == actionId,
                       let urlString = (btn["url"] as? String) ?? (btn["url"] as? NSString) as String?,
                       let url = URL(string: urlString) { return url }
                }
            }
        }
        for key in ["cta_url", "url", "link", "click_action"] {
            if let urlString = str(key), let url = URL(string: urlString) { return url }
        }
        return nil
    }

}