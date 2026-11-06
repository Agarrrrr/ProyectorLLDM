import java.awt.Color;
import java.awt.Dimension;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Path;
import java.util.Locale;
import javax.imageio.ImageIO;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.rendering.PDFRenderer;
import org.apache.poi.sl.usermodel.Slide;
import org.apache.poi.sl.usermodel.SlideShow;
import org.apache.poi.sl.usermodel.SlideShowFactory;

public final class RenderSlides {
    public static void main(String[] args) throws IOException {
        if (args.length != 4) throw new IllegalArgumentException("Expected format, input, output directory and max edge");
        File input = new File(args[1]);
        Path output = Path.of(args[2]);
        int maxEdge = Integer.parseInt(args[3]);
        if (maxEdge < 1280 || maxEdge > 7680) throw new IllegalArgumentException("Invalid maximum edge");
        switch (args[0]) {
            case ".pdf" -> renderPdf(input, output, maxEdge);
            case ".ppt", ".pptx" -> renderPowerPoint(input, output, maxEdge);
            default -> throw new IllegalArgumentException("Unsupported presentation format");
        }
    }

    private static void validatePageCount(int count) throws IOException {
        if (count < 1 || count > 300) throw new IOException("Expected 1 to 300 pages");
    }

    private static double scale(double width, double height, int maxEdge) throws IOException {
        if (!Double.isFinite(width) || !Double.isFinite(height) || width <= 0 || height <= 0) {
            throw new IOException("Invalid page dimensions");
        }
        return maxEdge / Math.max(width, height);
    }

    private static void write(BufferedImage image, Path output, int page) throws IOException {
        String name = String.format(Locale.ROOT, "slide_%03d.png", page);
        if (!ImageIO.write(image, "png", output.resolve(name).toFile())) throw new IOException("PNG encoder unavailable");
    }

    private static void renderPdf(File input, Path output, int maxEdge) throws IOException {
        try (PDDocument document = Loader.loadPDF(input)) {
            validatePageCount(document.getNumberOfPages());
            PDFRenderer renderer = new PDFRenderer(document);
            renderer.setSubsamplingAllowed(true);
            for (int i = 0; i < document.getNumberOfPages(); i++) {
                PDRectangle box = document.getPage(i).getCropBox();
                float scale = (float) scale(box.getWidth(), box.getHeight(), maxEdge);
                write(renderer.renderImage(i, scale), output, i + 1);
            }
        }
    }

    private static void renderPowerPoint(File input, Path output, int maxEdge) throws IOException {
        try (SlideShow<?, ?> deck = SlideShowFactory.create(input, null, true)) {
            validatePageCount(deck.getSlides().size());
            Dimension size = deck.getPageSize();
            double scale = scale(size.getWidth(), size.getHeight(), maxEdge);
            int width = Math.max(1, (int) Math.round(size.getWidth() * scale));
            int height = Math.max(1, (int) Math.round(size.getHeight() * scale));
            int page = 0;
            for (Slide<?, ?> slide : deck.getSlides()) {
                BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
                Graphics2D graphics = image.createGraphics();
                try {
                    graphics.setColor(Color.WHITE);
                    graphics.fillRect(0, 0, width, height);
                    graphics.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
                    graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
                    graphics.scale(scale, scale);
                    slide.draw(graphics);
                } finally {
                    graphics.dispose();
                }
                write(image, output, ++page);
            }
        }
    }
}
