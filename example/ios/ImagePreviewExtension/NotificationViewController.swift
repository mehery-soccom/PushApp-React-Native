import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

  @IBOutlet weak var imageView: UIImageView!
  @IBOutlet weak var textLabel: UILabel!

  override func viewDidLoad() {
    super.viewDidLoad()
  }

  func didReceive(_ notification: UNNotification) {
    let content = notification.request.content

    // Display body text
    textLabel.text = content.body

    // Display attached image
    if let attachment = content.attachments.first, attachment.url.startAccessingSecurityScopedResource() {
      let imageData = try? Data(contentsOf: attachment.url)
      if let data = imageData {
        imageView.image = UIImage(data: data)
      }
      attachment.url.stopAccessingSecurityScopedResource()
    }
  }
}
