import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var textLabel: UILabel!

    private let landscapeAspectRatio: CGFloat = 16.0 / 9.0

    private var images: [UIImage] = []
    private var currentIndex: Int = 0
    private var notification: UNNotification?

    override func viewDidLoad() {
        super.viewDidLoad()

        imageView.contentMode = .scaleAspectFit
        imageView.clipsToBounds = true
        imageView.backgroundColor = .black

        textLabel.textAlignment = .center
        textLabel.numberOfLines = 0
        textLabel.textColor = .white
        textLabel.backgroundColor = UIColor.black.withAlphaComponent(0.5)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        let imageHeight = view.bounds.width * landscapeAspectRatio
        let textHeight = textLabel.intrinsicContentSize.height + 16
        let totalHeight = imageHeight + textHeight

        preferredContentSize = CGSize(width: view.bounds.width, height: totalHeight)
    }

    func didReceive(_ notification: UNNotification) {
        print("✅ didReceive called in Content Extension")
        self.notification = notification

        textLabel.text = notification.request.content.body
        
        // LOAD ALL IMAGE ATTACHMENTS
        let attachments = notification.request.content.attachments
        
        if attachments.isEmpty {
            print("❌ No attachments found")
            return
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

        print("📸 Loaded \(images.count) images")

        // SHOW FIRST IMAGE
        currentIndex = 0
        updateImage()
    }

    private func updateImage() {
        guard !images.isEmpty else { return }

        let image = images[currentIndex]
        DispatchQueue.main.async {
            self.imageView.image = image
        }
        print("🖼 Showing image \(currentIndex + 1) / \(images.count)")
    }

    // 🔥 Handle NEXT / PREVIOUS actions
    func didReceive(_ response: UNNotificationResponse,
                    completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {

        switch response.actionIdentifier {
        case "PUSHAPP_NEXT":
            print("➡️ NEXT pressed")
            currentIndex = (currentIndex + 1) % images.count
            updateImage()

        case "PUSHAPP_PREVIOUS":
            print("⬅️ PREVIOUS pressed")
            currentIndex = (currentIndex - 1 + images.count) % images.count
            updateImage()

        default:
            break
        }

        completion(.doNotDismiss)
    }
}
