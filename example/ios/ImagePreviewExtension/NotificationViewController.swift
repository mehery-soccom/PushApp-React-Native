import UIKit
import UserNotifications
import UserNotificationsUI
import YCarousel

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    @IBOutlet weak var carouselView: CarouselView!
    @IBOutlet weak var textLabel: UILabel!

    private let provider = CarouselAttachmentDataSource()

    private let aspectRatio: CGFloat = 16.0 / 9.0

    override func viewDidLoad() {
        super.viewDidLoad()

        textLabel.textAlignment = .center
        textLabel.numberOfLines = 0
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()

        let imageHeight = view.bounds.width / aspectRatio
        let textHeight = textLabel.intrinsicContentSize.height + 16

        preferredContentSize = CGSize(
            width: view.bounds.width,
            height: imageHeight + textHeight
        )
    }

    func didReceive(_ notification: UNNotification) {
        print("📨 didReceive called")

        textLabel.text = notification.request.content.body

        let attachments = notification.request.content.attachments
        var views: [UIView] = []

        for attachment in attachments {
            let url = attachment.url
            _ = url.startAccessingSecurityScopedResource()

            if let data = try? Data(contentsOf: url),
               let image = UIImage(data: data) {

                let iv = UIImageView(image: image)
                iv.contentMode = .scaleAspectFit
                iv.clipsToBounds = true
                views.append(iv)
            }

            url.stopAccessingSecurityScopedResource()
        }

        if views.isEmpty {
            print("⚠️ No images available")
            return
        }

        print("📸 Setting \(views.count) carousel pages")

        // ✔ Feed your views to the provider
        provider.setViews(views)

        // ✔ Assign provider to the carousel
        carouselView.dataSource = provider
    }
}
