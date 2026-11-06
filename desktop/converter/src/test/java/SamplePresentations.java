import java.awt.Color;
import java.awt.Rectangle;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.encryption.AccessPermission;
import org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy;
import org.apache.poi.hslf.usermodel.HSLFSlideShow;
import org.apache.poi.sl.usermodel.ShapeType;
import org.apache.poi.sl.usermodel.SlideShow;
import org.apache.poi.xslf.usermodel.XMLSlideShow;

public final class SamplePresentations {
    public static void main(String[] args) throws Exception {
        Path output = Path.of(args[0]);
        try (PDDocument pdf = new PDDocument()) {
            for (Color color : new Color[] {Color.BLUE, Color.RED}) {
                PDPage page = new PDPage(new PDRectangle(720, 405));
                pdf.addPage(page);
                try (PDPageContentStream content = new PDPageContentStream(pdf, page)) {
                    content.setNonStrokingColor(color);
                    content.addRect(40, 40, 200, 150);
                    content.fill();
                }
            }
            pdf.save(output.resolve("sample.pdf").toFile());
        }
        try (PDDocument pdf = new PDDocument()) {
            pdf.addPage(new PDPage(PDRectangle.A4));
            pdf.protect(new StandardProtectionPolicy("owner", "private", new AccessPermission()));
            pdf.save(output.resolve("protected.pdf").toFile());
        }
        try (PDDocument pdf = new PDDocument()) {
            for (int i = 0; i < 301; i++) pdf.addPage(new PDPage(PDRectangle.A4));
            pdf.save(output.resolve("too-many-pages.pdf").toFile());
        }
        makeDeck(new HSLFSlideShow(), output.resolve("sample.ppt"));
        makeDeck(new XMLSlideShow(), output.resolve("sample.pptx"));
    }

    private static void makeDeck(SlideShow<?, ?> deck, Path output) throws Exception {
        try (deck; OutputStream stream = Files.newOutputStream(output)) {
            for (Color color : new Color[] {Color.BLUE, Color.RED}) {
                var slide = deck.createSlide();
                var box = slide.createAutoShape();
                box.setShapeType(ShapeType.RECT);
                box.setAnchor(new Rectangle(40, 40, 200, 150));
                box.setFillColor(color);
                box.setText("Proyector LLDM");
            }
            deck.write(stream);
        }
    }
}
