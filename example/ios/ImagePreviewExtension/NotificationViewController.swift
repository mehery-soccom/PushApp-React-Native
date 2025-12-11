import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var containerView: UIView!
    @IBOutlet weak var titleLabel: UILabel!
    @IBOutlet weak var textLabel: UILabel!

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

        titleLabel.textColor = .white
        textLabel.textColor = .white
        titleLabel.font = UIFont.boldSystemFont(ofSize: 18)
        textLabel.font = UIFont.boldSystemFont(ofSize: 18)

        setupCarouselViews()
        setupGestures()
    }

    // ---------------------------------------------------------
    // MARK: - Layout Size
    // ---------------------------------------------------------
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        let maxWidth = view.bounds.width - 32
        let imageHeight = maxWidth * 0.56
        let titleHeight = titleLabel.intrinsicContentSize.height + 12
        let bodyHeight = textLabel.intrinsicContentSize.height + 12

        let totalHeight = titleHeight + bodyHeight + imageHeight + 32

        preferredContentSize = CGSize(width: maxWidth, height: totalHeight)
    }

    // ---------------------------------------------------------
    // MARK: - Receive Notification
    // ---------------------------------------------------------
    func didReceive(_ notification: UNNotification) {
        self.notification = notification

        titleLabel.text = notification.request.content.title
        textLabel.text = notification.request.content.body

        textLabel.isHidden = notification.request.content.body.trimmingCharacters(in: .whitespaces).isEmpty

        // Load images
        for attachment in notification.request.content.attachments {
            let url = attachment.url
            _ = url.startAccessingSecurityScopedResource()
            if let data = try? Data(contentsOf: url), let img = UIImage(data: data) {
                images.append(img)
            }
            url.stopAccessingSecurityScopedResource()
        }

        currentIndex = 0
        updateImage(animated: false)
        startAutoScroll()
    }

    // ---------------------------------------------------------
    // MARK: - Setup Carousel Views
    // ---------------------------------------------------------
    private func setupCarouselViews() {
        carouselView.translatesAutoresizingMaskIntoConstraints = false
        carouselView.clipsToBounds = true
        containerView.addSubview(carouselView)

        // Position carousel where old ImageView used to be
        NSLayoutConstraint.activate([
            carouselView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            carouselView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            carouselView.topAnchor.constraint(equalTo: textLabel.bottomAnchor, constant: 4),
            carouselView.heightAnchor.constraint(equalTo: containerView.widthAnchor, multiplier: 0.56),
            carouselView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor)
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

        NSLayoutConstraint.activate([
            currentImageView.leadingAnchor.constraint(equalTo: carouselView.leadingAnchor),
            currentImageView.topAnchor.constraint(equalTo: carouselView.topAnchor),
            currentImageView.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor),
            currentImageView.widthAnchor.constraint(equalTo: carouselView.widthAnchor),

            nextImageView.leadingAnchor.constraint(equalTo: currentImageView.trailingAnchor, constant: -40),
            nextImageView.topAnchor.constraint(equalTo: carouselView.topAnchor),
            nextImageView.bottomAnchor.constraint(equalTo: carouselView.bottomAnchor),
            nextImageView.widthAnchor.constraint(equalTo: carouselView.widthAnchor)
        ])
    }

    // ---------------------------------------------------------
    // MARK: - Gestures
    // ---------------------------------------------------------
    private func setupGestures() {
        carouselView.isUserInteractionEnabled = true

        let left = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
        left.direction = .left
        carouselView.addGestureRecognizer(left)

        let right = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
        right.direction = .right
        carouselView.addGestureRecognizer(right)
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
        guard !images.isEmpty else { return }

        let nextIndex = (currentIndex + 1) % images.count

        nextImageView.image = images[nextIndex]

        UIView.animate(withDuration: 0.35, delay: 0, options: .curveEaseInOut, animations: {
            self.currentImageView.transform = CGAffineTransform(translationX: -self.carouselView.bounds.width + 40, y: 0)
            self.nextImageView.transform = CGAffineTransform(translationX: -self.carouselView.bounds.width + 40, y: 0)
        }, completion: { _ in
            // Move forward
            self.currentIndex = nextIndex

            // Reset transforms
            self.currentImageView.transform = .identity
            self.nextImageView.transform = .identity

            // Prepare next
            self.currentImageView.image = self.images[self.currentIndex]
        })
    }

    // ---------------------------------------------------------
    // MARK: - Swipe Handling
    // ---------------------------------------------------------
    @objc private func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
        autoScrollTimer?.invalidate()

        if gesture.direction == .left {
            animateForward()
        } else if gesture.direction == .right {
            animateBackward()
        }
    }

    private func animateBackward() {
        guard !images.isEmpty else { return }

        let prevIndex = (currentIndex - 1 + images.count) % images.count

        nextImageView.image = images[prevIndex]

        // Place previous image to the left side
        currentImageView.transform = .identity
        nextImageView.transform = CGAffineTransform(translationX: -carouselView.bounds.width + 40, y: 0)

        UIView.animate(withDuration: 0.35, delay: 0, options: .curveEaseInOut, animations: {
            self.currentImageView.transform = CGAffineTransform(translationX: self.carouselView.bounds.width - 40, y: 0)
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
