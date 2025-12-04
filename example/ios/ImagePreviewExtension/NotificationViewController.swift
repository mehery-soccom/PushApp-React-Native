import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var containerView: UIView!
    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var textLabel: UILabel!

    private var images: [UIImage] = []
    private var currentIndex: Int = 0
    private var notification: UNNotification?

    override func viewDidLoad() {
        super.viewDidLoad()

        // Transparent everything
        view.backgroundColor = .clear
        containerView.backgroundColor = .clear
        textLabel.backgroundColor = .clear

        // Rounded image
        imageView.layer.cornerRadius = 22
        imageView.layer.masksToBounds = true

        // Make image fill area (no black gaps)
        imageView.contentMode = .scaleAspectFill
        imageView.backgroundColor = .clear

        // Text styling
        textLabel.textAlignment = .center
        textLabel.numberOfLines = 0
        textLabel.textColor = .white
        textLabel.font = UIFont.boldSystemFont(ofSize: 22)   // Bigger text

        // Enable swipe gestures
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

        // Compact + clean layout
        let maxWidth = view.bounds.width - 32                      // side padding
        let imageHeight = maxWidth * 0.56                          // cinematic ratio (not too tall)
        let textHeight = textLabel.intrinsicContentSize.height + 24
        let totalHeight = imageHeight + textHeight + 24            // padding

        preferredContentSize = CGSize(width: maxWidth, height: totalHeight)
    }

    func didReceive(_ notification: UNNotification) {
        self.notification = notification

        let body = notification.request.content.body.trimmingCharacters(in: .whitespacesAndNewlines)
        textLabel.isHidden = body.isEmpty


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
