import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var textLabel: UILabel!

    // Landscape ratio (16:9)
    private let landscapeAspectRatio: CGFloat = 16.0 / 9.0

    override func viewDidLoad() {
        super.viewDidLoad()

        // Configure image view
        imageView.contentMode = .scaleAspectFit   // ✅ Keeps entire image visible
        imageView.clipsToBounds = true
        imageView.backgroundColor = .black

        // Configure text overlay
        textLabel.textAlignment = .center
        textLabel.numberOfLines = 0
        textLabel.textColor = .white
        textLabel.backgroundColor = UIColor.black.withAlphaComponent(0.5)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        // ✅ Set preferred height based on landscape ratio (width * 9/16)
        let imageHeight = view.bounds.width * landscapeAspectRatio
        let textHeight = textLabel.intrinsicContentSize.height + 16
        let totalHeight = imageHeight + textHeight

        preferredContentSize = CGSize(width: view.bounds.width, height: totalHeight)
    }

    func didReceive(_ notification: UNNotification) {
        print("✅ didReceive called in Content Extension")

        textLabel.text = notification.request.content.body

        if let attachment = notification.request.content.attachments.first {
            let url = attachment.url
            _ = url.startAccessingSecurityScopedResource()
            defer { url.stopAccessingSecurityScopedResource() }

            if let data = try? Data(contentsOf: url),
               let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    self.imageView.image = image
                    print("✅ Landscape image displayed successfully")
                }
            } else {
                print("⚠️ Failed to load image data")
            }
        } else {
            print("❌ No attachments found")
        }
    }
}
