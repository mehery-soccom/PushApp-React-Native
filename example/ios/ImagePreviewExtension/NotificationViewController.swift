import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var imageView: UIImageView!
    @IBOutlet weak var textLabel: UILabel!

    override func viewDidLoad() {
        super.viewDidLoad()

        // Configure image view
        imageView.contentMode = .scaleAspectFill
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
        // Ensure full-screen layout on expand
        preferredContentSize = CGSize(width: self.view.bounds.width, height: self.view.bounds.height)
    }

    func didReceive(_ notification: UNNotification) {
        print("✅ didReceive called in Content Extension")
        self.extensionContext?.mediaPlayPauseButtonType = .default

        textLabel.text = notification.request.content.body

        if let attachment = notification.request.content.attachments.first {
            let url = attachment.url
            _ = url.startAccessingSecurityScopedResource()
            defer { url.stopAccessingSecurityScopedResource() }

            if let data = try? Data(contentsOf: url),
               let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    self.imageView.image = image
                    print("✅ Image displayed")
                }
            } else {
                print("⚠️ Failed to load image data")
            }
        } else {
            print("❌ No attachments found")
        }
    }
}
