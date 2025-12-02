import UIKit
import YCarousel

class CarouselAttachmentDataSource: CarouselViewDataSource {

    private var pages: [UIView] = []

    func setViews(_ views: [UIView]) {
        self.pages = views
    }

    func carouselView(pageAt index: Int) -> UIView {
        return pages[index]
    }

    var numberOfPages: Int {
        return pages.count
    }
}
