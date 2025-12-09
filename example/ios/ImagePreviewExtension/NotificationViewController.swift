import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var containerView: UIView!
    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var titleLabel: UILabel!   // NEW

    @IBOutlet weak var textLabel: UILabel!

    private var images: [UIImage] = []
    private var currentIndex: Int = 0
    private var notification: UNNotification?
    private var autoScrollTimer: Timer?


    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .clear
        containerView.backgroundColor = .clear
        
        // Title style
        titleLabel.backgroundColor = .clear
        titleLabel.textAlignment = .left
        titleLabel.textColor = .white
        textLabel.font = UIFont.boldSystemFont(ofSize: 18)

        // Body style
        textLabel.backgroundColor = .clear
        textLabel.textAlignment = .left
        textLabel.numberOfLines = 0
        textLabel.textColor = .white
        textLabel.font = UIFont.boldSystemFont(ofSize: 18)

        // Image styling
        // imageView.layer.cornerRadius = 22
        imageView.layer.masksToBounds = true
        imageView.contentMode = .scaleAspectFill

        // Swipe gestures
        let swipeLeft = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
        swipeLeft.direction = .left
        imageView.isUserInteractionEnabled = true
        imageView.addGestureRecognizer(swipeLeft)

        let swipeRight = UISwipeGestureRecognizer(target: self, action: #selector(handleSwipe(_:)))
        swipeRight.direction = .right
        imageView.addGestureRecognizer(swipeRight)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        let maxWidth = view.bounds.width - 32
        let imageHeight = maxWidth * 0.56
        let titleHeight = titleLabel.intrinsicContentSize.height + 12
        let bodyHeight = textLabel.intrinsicContentSize.height + 12

        let totalHeight = titleHeight + bodyHeight + imageHeight + 32
        
        preferredContentSize = CGSize(width: maxWidth, height: totalHeight)
    }

    func didReceive(_ notification: UNNotification) {
        self.notification = notification

        let body = notification.request.content.body.trimmingCharacters(in: .whitespacesAndNewlines)

        textLabel.isHidden = body.isEmpty

        titleLabel.text = notification.request.content.title

        textLabel.text = notification.request.content.body

        let attachments = notification.request.content.attachments

        if notification.request.content.body.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            textLabel.isHidden = true
        } else {
            textLabel.isHidden = false
        }

        for attachment in attachments {
            let url = attachment.url
            _ = url.startAccessingSecurityScopedResource()
            defer { url.stopAccessingSecurityScopedResource() }

            if let data = try? Data(contentsOf: url),
               let img = UIImage(data: data) {
                images.append(img)
            }
        }

        currentIndex = 0
        updateImage()
        startAutoScroll()

    }

    private func startAutoScroll() {
    autoScrollTimer?.invalidate()  // stop previous timer if any
    autoScrollTimer = Timer.scheduledTimer(withTimeInterval: 3.0, repeats: true) { [weak self] _ in
        guard let self = self, !self.images.isEmpty else { return }

        self.currentIndex = (self.currentIndex + 1) % self.images.count
        self.updateImage()
        }
    }


    private func updateImage() {
        guard !images.isEmpty else { return }

        let image = images[currentIndex]

        // Smooth fade animation
        UIView.transition(with: imageView,
                          duration: 0.25,
                          options: .transitionCrossDissolve,
                          animations: {
            self.imageView.image = image
        }, completion: nil)
    }

    // MARK: - Swipe Handler
    @objc private func handleSwipe(_ gesture: UISwipeGestureRecognizer) {
    if images.isEmpty { return }

    // Stop auto-scroll when user interacts
    autoScrollTimer?.invalidate()

    switch gesture.direction {
    case .left:
        currentIndex = (currentIndex + 1) % images.count
    case .right:
        currentIndex = (currentIndex - 1 + images.count) % images.count
    default:
        break
    }

    updateImage()
}


    // MARK: - Notification Action Buttons (Next / Previous)
    func didReceive(_ response: UNNotificationResponse,
                    completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {

        // switch response.actionIdentifier {
        // case "PUSHAPP_NEXT":
        //     currentIndex = (currentIndex + 1) % images.count
        //     updateImage()

        // case "PUSHAPP_PREVIOUS":
        //     currentIndex = (currentIndex - 1 + images.count) % images.count
        //     updateImage()

        // default:
        //     break
        // }

        completion(.doNotDismiss)
    }
}
