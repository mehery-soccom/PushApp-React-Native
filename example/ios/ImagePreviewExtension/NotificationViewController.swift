import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

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

    // NEW VIEWS (carousel)
    private let carouselView = UIView()
    private let currentImageView = UIImageView()
    private let nextImageView = UIImageView()

    // ---------------------------------------------------------
    // MARK: - viewDidLoad
    // ---------------------------------------------------------
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .clear
        containerView.backgroundColor = .clear

        // Set up label appearance
        titleLabel.textColor = .white
        textLabel.textColor = .white

        textLabel.backgroundColor = .clear
        titleLabel.backgroundColor = .clear

        titleLabel.font = UIFont.boldSystemFont(ofSize: 18)
        textLabel.font = UIFont.systemFont(ofSize: 16) // Changed body font to be slightly smaller and not bold for visual separation

        // Configure logo appearance
        logoImageView.contentMode = .scaleAspectFit
        logoImageView.clipsToBounds = true
        
        setupCarouselViews()
        setupGestures()
    }

   // ---------------------------------------------------------
// MARK: - Layout Size (Optimized)
// ---------------------------------------------------------
override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()

    // Adjustable constants (edit here only)
    let sidePadding: CGFloat = 16
    let spacingAboveCarousel: CGFloat = 40     // space between body text -> carousel
    let carouselHeightMultiplier: CGFloat = 0.5

    // Width available for layout
    let maxWidth = view.bounds.width - sidePadding

    // Title + logo combined height
    let logoHeight = logoImageView.bounds.height
    let titleHeight = titleLabel.intrinsicContentSize.height
    let titleBlockHeight = max(logoHeight, titleHeight) + 8

    logoImageView.layer.cornerRadius = 8
    logoImageView.layer.masksToBounds = true

    // Body text height (0 if empty)
    let bodyHeight = textLabel.isHidden
        ? 0
        : textLabel.intrinsicContentSize.height + 4

    // Carousel height based on multiplier
    let carouselHeight = maxWidth * carouselHeightMultiplier

    // FINAL calculated height
    let totalHeight =
        titleBlockHeight
        + bodyHeight
        + spacingAboveCarousel
        + carouselHeight
        - 12

    preferredContentSize = CGSize(width: maxWidth, height: totalHeight)
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
    // ✅ 2. LOAD CAROUSEL IMAGES
    // ---------------------------------------------------------
    images.removeAll()

    for attachment in notification.request.content.attachments {
        // Skip the logo (identifier == "logo")
        if attachment.identifier == "logo" { continue }

        let ext = attachment.url.pathExtension.lowercased()
        if ["png", "jpg", "jpeg"].contains(ext) {
            _ = attachment.url.startAccessingSecurityScopedResource()
            if let data = try? Data(contentsOf: attachment.url),
               let img = UIImage(data: data) {
                images.append(img)
            }
            attachment.url.stopAccessingSecurityScopedResource()
        }
    }

    // ---------------------------------------------------------
    // ✅ 3. START CAROUSEL IF IMAGES EXIST
    // ---------------------------------------------------------
    if !images.isEmpty {
    currentIndex = 0
    updateImage(animated: false)

    if isCarouselEnabled {
        startAutoScroll()
        carouselView.isUserInteractionEnabled = true
    } else {
        autoScrollTimer?.invalidate()
        carouselView.isUserInteractionEnabled = false
    }
} else {
    carouselView.removeFromSuperview()
}

}


    // ---------------------------------------------------------
    // MARK: - Setup Carousel Views
    // ---------------------------------------------------------
    private func setupCarouselViews() {
        carouselView.translatesAutoresizingMaskIntoConstraints = false
        carouselView.clipsToBounds = true
        containerView.addSubview(carouselView)

        // Position carousel below TextLabel
        NSLayoutConstraint.activate([
            carouselView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            carouselView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            carouselView.topAnchor.constraint(equalTo: textLabel.bottomAnchor, constant: 15), // spacing between image and texts
            carouselView.heightAnchor.constraint(equalTo: containerView.widthAnchor, multiplier: 0.5), // Fixed aspect ratio
            // carouselView.bottomAnchor.constraint(lessThanOrEqualTo: containerView.bottomAnchor, constant: -8) // Add small bottom margin
        ])

        // Add scrolling images
        currentImageView.translatesAutoresizingMaskIntoConstraints = false
        nextImageView.translatesAutoresizingMaskIntoConstraints = false

        currentImageView.contentMode = .scaleAspectFill
        nextImageView.contentMode = .scaleAspectFill
        currentImageView.clipsToBounds = true
        nextImageView.clipsToBounds = true

        carouselView.addSubview(currentImageView)
        carouselView.addSubview(nextImageView)

        carouselView.clipsToBounds = true
        carouselView.layer.masksToBounds = true

        // Setup image view constraints
        NSLayoutConstraint.activate([
            // Current image starts at the leading edge
            currentImageView.leadingAnchor.constraint(equalTo: carouselView.leadingAnchor),
            currentImageView.topAnchor.constraint(equalTo: carouselView.topAnchor),
            currentImageView.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor),
            currentImageView.widthAnchor.constraint(equalTo: carouselView.widthAnchor),

            // Next image is positioned right next to the current image's trailing edge
            // **NOTE:** The constant '-40' in your original code causes an overlap/misalignment. 
            // For a standard carousel, it should start outside the bounds.
            nextImageView.leadingAnchor.constraint(equalTo: currentImageView.trailingAnchor),
            nextImageView.topAnchor.constraint(equalTo: carouselView.topAnchor),
            nextImageView.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor),
            nextImageView.widthAnchor.constraint(equalTo: carouselView.widthAnchor)
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

        carouselView.isUserInteractionEnabled = false // default
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

    // ---------------------------------------------------------
    // MARK: - Update Image (Sliding Animation)
    // ---------------------------------------------------------
    private func updateImage(animated: Bool) {
        guard !images.isEmpty else { return }

        let nextIndex = (currentIndex + 1) % images.count

        currentImageView.image = images[currentIndex]
        nextImageView.image = images[nextIndex]

        if !animated {
            currentImageView.transform = .identity
            nextImageView.transform = .identity
            return
        }
    }

   private func animateForward() {
    guard isCarouselEnabled else { return }
    guard !images.isEmpty else { return }

    let nextIndex = (currentIndex + 1) % images.count

    nextImageView.image = images[nextIndex]

    UIView.animate(withDuration: 0.35, delay: 0, options: .curveEaseInOut, animations: {
        let translation = -self.carouselView.bounds.width
        self.currentImageView.transform = CGAffineTransform(translationX: translation, y: 0)
        self.nextImageView.transform = CGAffineTransform(translationX: translation, y: 0)
    }, completion: { _ in
        self.currentIndex = nextIndex
        self.currentImageView.transform = .identity
        self.nextImageView.transform = .identity
        self.currentImageView.image = self.images[self.currentIndex]
    })
}


    // ---------------------------------------------------------
    // MARK: - Swipe Handling
    // ---------------------------------------------------------
    @objc private func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
    guard isCarouselEnabled else { return }

    autoScrollTimer?.invalidate()

    if gesture.direction == .left {
        animateForward()
    } else if gesture.direction == .right {
        animateBackward()
    }

    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
        self?.startAutoScroll()
    }
}


    private func animateBackward() {
    guard isCarouselEnabled else { return }
    guard !images.isEmpty else { return }

    let prevIndex = (currentIndex - 1 + images.count) % images.count

    nextImageView.image = images[prevIndex]
    nextImageView.transform = CGAffineTransform(translationX: -carouselView.bounds.width, y: 0)

    UIView.animate(withDuration: 0.35, delay: 0, options: .curveEaseInOut, animations: {
        let translation = self.carouselView.bounds.width
        self.currentImageView.transform = CGAffineTransform(translationX: translation, y: 0)
        self.nextImageView.transform = .identity
    }, completion: { _ in
        self.currentIndex = prevIndex
        self.currentImageView.transform = .identity
        self.nextImageView.transform = .identity
        self.currentImageView.image = self.images[self.currentIndex]
    })
}

    // ---------------------------------------------------------
    // MARK: - Notification Action Buttons
    // ---------------------------------------------------------
    func didReceive(
        _ response: UNNotificationResponse,
        completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void
    ) {
        completion(.doNotDismiss)
    }
}