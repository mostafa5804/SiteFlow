import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

/**
 * Converts a set of OKLCH values to standard SRGB representation.
 */
function oklchToRgb(l: number, c: number, h: number, a: number = 1): string {
  // Convert hue to radians
  const hRad = (h * Math.PI) / 180;
  
  // Transform OKLCH to OKLAB
  const aLab = c * Math.cos(hRad);
  const bLab = c * Math.sin(hRad);
  
  // OKLAB to LMS (linear)
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;
  
  // Inverse non-linearity
  const l_lms = Math.pow(Math.max(l_, 0), 3);
  const m_lms = Math.pow(Math.max(m_, 0), 3);
  const s_lms = Math.pow(Math.max(s_, 0), 3);
  
  // LMS to Linear RGB
  const r_linear = +4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
  const g_linear = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
  const b_linear = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;
  
  // Linear RGB to sRGB helper
  const toSRGB = (x: number) => {
    return x <= 0.0031308
      ? 12.92 * x
      : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  
  const r_val = Math.max(0, Math.min(1, toSRGB(r_linear)));
  const g_val = Math.max(0, Math.min(1, toSRGB(g_linear)));
  const b_val = Math.max(0, Math.min(1, toSRGB(b_linear)));
  
  const r = Math.round(r_val * 255);
  const g = Math.round(g_val * 255);
  const b = Math.round(b_val * 255);
  
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

/**
 * Converts standard OKLAB coordinates to standard SRGB representation.
 */
function oklabToRgb(l: number, aLab: number, bLab: number, a: number = 1): string {
  // OKLAB to LMS (linear)
  const l_ = l + 0.3963377774 * aLab + 0.2158037573 * bLab;
  const m_ = l - 0.1055613458 * aLab - 0.0638541728 * bLab;
  const s_ = l - 0.0894841775 * aLab - 1.2914855480 * bLab;
  
  // Inverse non-linearity
  const l_lms = Math.pow(Math.max(l_, 0), 3);
  const m_lms = Math.pow(Math.max(m_, 0), 3);
  const s_lms = Math.pow(Math.max(s_, 0), 3);
  
  // LMS to Linear RGB
  const r_linear = +4.0767416621 * l_lms - 3.3077115913 * m_lms + 0.2309699292 * s_lms;
  const g_linear = -1.2684380046 * l_lms + 2.6097574011 * m_lms - 0.3413193965 * s_lms;
  const b_linear = -0.0041960863 * l_lms - 0.7034186147 * m_lms + 1.7076147010 * s_lms;
  
  // Linear RGB to sRGB helper
  const toSRGB = (x: number) => {
    return x <= 0.0031308
      ? 12.92 * x
      : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
  };
  
  const r_val = Math.max(0, Math.min(1, toSRGB(r_linear)));
  const g_val = Math.max(0, Math.min(1, toSRGB(g_linear)));
  const b_val = Math.max(0, Math.min(1, toSRGB(b_linear)));
  
  const r = Math.round(r_val * 255);
  const g = Math.round(g_val * 255);
  const b = Math.round(b_val * 255);
  
  if (a === 1) {
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
}

/**
 * Parses and replaces all oklab(...) occurrences in a CSS or style string
 * with standard rgb or rgba color values.
 */
export function replaceOklabInString(cssText: string): string {
  if (!cssText || !cssText.trim() || !cssText.includes("oklab")) return cssText;
  
  const oklabRegex = /oklab\(\s*([^()]+(?:\([^()]*\)[^()]*)*)\s*\)/gi;
  
  return cssText.replace(oklabRegex, (match, innerContent) => {
    try {
      let colorPart = innerContent.trim();
      let alphaPart = "1";
      
      if (innerContent.includes("/")) {
        const parts = innerContent.split("/");
        colorPart = parts[0].trim();
        alphaPart = parts[1].trim();
      }
      
      const colorCoords = colorPart.replace(/,/g, " ").trim().split(/\s+/);
      if (colorCoords.length < 3) return match;
      
      const lStr = colorCoords[0];
      const aStr = colorCoords[1];
      const bStr = colorCoords[2];
      
      const l = lStr.endsWith("%") ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const aLab = aStr.endsWith("%") ? parseFloat(aStr) / 100 : parseFloat(aStr);
      const bLab = bStr.endsWith("%") ? parseFloat(bStr) / 100 : parseFloat(bStr);
      
      let a = 1;
      if (alphaPart.includes("var(")) {
        const varMatch = alphaPart.match(/,\s*([0-9.]+)/);
        if (varMatch) {
          a = parseFloat(varMatch[1]);
        } else {
          a = 1;
        }
      } else {
        a = alphaPart.endsWith("%") ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
      }
      
      if (isNaN(l) || isNaN(aLab) || isNaN(bLab)) return match;
      if (isNaN(a)) a = 1;
      
      return oklabToRgb(l, aLab, bLab, a);
    } catch (e) {
      console.error("Failed to convert OKLAB pattern:", match, e);
      return match;
    }
  });
}

/**
 * Parses and replaces all oklch(...) occurrences in a CSS or style string
 * with standard rgb or rgba color values.
 */
function replaceOklchDirect(cssText: string): string {
  if (!cssText || !cssText.trim() || !cssText.includes("oklch")) return cssText;
  
  // Regex supporting oklch with up to one level of nested parentheses (e.g. var helper variables)
  const oklchRegex = /oklch\(\s*([^()]+(?:\([^()]*\)[^()]*)*)\s*\)/gi;
  
  return cssText.replace(oklchRegex, (match, innerContent) => {
    try {
      let colorPart = innerContent.trim();
      let alphaPart = "1";
      
      if (innerContent.includes("/")) {
        const parts = innerContent.split("/");
        colorPart = parts[0].trim();
        alphaPart = parts[1].trim();
      }
      
      const colorCoords = colorPart.replace(/,/g, " ").trim().split(/\s+/);
      if (colorCoords.length < 3) return match;
      
      const lStr = colorCoords[0];
      const cStr = colorCoords[1];
      const hStr = colorCoords[2];
      
      const l = lStr.endsWith("%") ? parseFloat(lStr) / 100 : parseFloat(lStr);
      const c = cStr.endsWith("%") ? parseFloat(cStr) / 100 : parseFloat(cStr);
      
      let h = 0;
      if (hStr.endsWith("deg")) {
        h = parseFloat(hStr);
      } else if (hStr.endsWith("rad")) {
        h = (parseFloat(hStr) * 180) / Math.PI;
      } else if (hStr.endsWith("grad")) {
        h = (parseFloat(hStr) * 360) / 400;
      } else if (hStr.endsWith("turn")) {
        h = parseFloat(hStr) * 360;
      } else {
        h = parseFloat(hStr);
      }
      
      let a = 1;
      if (alphaPart.includes("var(")) {
        const varMatch = alphaPart.match(/,\s*([0-9.]+)/);
        if (varMatch) {
          a = parseFloat(varMatch[1]);
        } else {
          a = 1;
        }
      } else {
        a = alphaPart.endsWith("%") ? parseFloat(alphaPart) / 100 : parseFloat(alphaPart);
      }
      
      if (isNaN(l) || isNaN(c) || isNaN(h)) return match;
      if (isNaN(a)) a = 1;
      
      return oklchToRgb(l, c, h, a);
    } catch (e) {
      console.error("Failed to convert OKLCH pattern:", match, e);
      return match;
    }
  });
}

/**
 * Universal color translator for modern format inputs (oklch, oklab)
 * to standard colors.
 */
export function replaceOklchInString(cssText: string): string {
  let cleaned = cssText;
  if (!cleaned || !cleaned.trim()) return cleaned;
  
  if (cleaned.includes("oklch")) {
    cleaned = replaceOklchDirect(cleaned);
  }
  
  if (cleaned.includes("oklab")) {
    cleaned = replaceOklabInString(cleaned);
  }
  
  return cleaned;
}

/**
 * Highly optimized PDF generator that captures an element, scales it, 
 * handles multi-page overflow dynamically, and downloads it cleanly.
 * 
 * @param elementId The target HTML element ID to capture
 * @param fileName Generated PDF file name (without extension)
 * @param onProgress Callback to report loading/progress state
 */
export async function generateDirectPDF(
  elementId: string, 
  fileName: string, 
  onProgress?: (active: boolean, message: string) => void,
  options?: { orientation?: "portrait" | "landscape" }
) {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found.`);
    return;
  }

  // Preprocess and replace OKLCH in all style sheets/elements of the ORIGINAL document
  const originalStylesToRestore: Array<{ tag: HTMLStyleElement; originalText: string }> = [];
  const originalLinksToRestore: Array<{ tag: HTMLLinkElement; disabled: boolean }> = [];
  const newlyInjectedStyles: HTMLStyleElement[] = [];

  try {
    if (onProgress) onProgress(true, "در حال منسجم‌سازی و پردازش گرافیکی صفحات... لطفاً شکیبا باشید.");

    // Parse external and internal stylesheets of the parent window to prevent html2canvas color parse crash
    for (let i = 0; i < document.styleSheets.length; i++) {
      try {
        const sheet = document.styleSheets[i];
        if (!sheet) continue;
        const ownerNode = sheet.ownerNode;
        if (!ownerNode) continue;
        
        if (ownerNode instanceof HTMLStyleElement) {
          const text = ownerNode.textContent || "";
          if (text.includes("oklch") || text.includes("oklab")) {
            originalStylesToRestore.push({ tag: ownerNode, originalText: text });
            ownerNode.textContent = replaceOklchInString(text);
          }
        } else if (ownerNode instanceof HTMLLinkElement) {
          try {
            const rules = sheet.cssRules || sheet.rules;
            if (!rules) continue;
            let hasOklch = false;
            for (let r = 0; r < rules.length; r++) {
              const rule = rules[r];
              if (rule && rule.cssText && (rule.cssText.includes("oklch") || rule.cssText.includes("oklab"))) {
                hasOklch = true;
                break;
              }
            }
            if (hasOklch) {
              originalLinksToRestore.push({ tag: ownerNode, disabled: ownerNode.disabled });
              ownerNode.disabled = true;
              
              const cssTexts: string[] = [];
              for (let r = 0; r < rules.length; r++) {
                const rule = rules[r];
                if (rule && rule.cssText) {
                  cssTexts.push(rule.cssText);
                }
              }
              const cleanCss = replaceOklchInString(cssTexts.join("\n"));
              const newStyle = document.createElement("style");
              newStyle.textContent = cleanCss;
              document.head.appendChild(newStyle);
              newlyInjectedStyles.push(newStyle);
            }
          } catch (corsErr) {
            // Squelch CORS stylesheet access issues gracefully
          }
        }
      } catch (sheetErr) {
        // Squelch stylesheet loop access errors
      }
    }

    // Store original layout constraints
    const originalStyle = element.getAttribute("style") || "";
    const originalMaxHeight = element.style.maxHeight;
    const originalOverflow = element.style.overflow;

    // Expand element to full size so html2canvas captures everything without scrolling
    element.style.maxHeight = "none";
    element.style.overflow = "visible";
    
    const isLandscape = options?.orientation === "landscape";
    const documentWidth = isLandscape ? 1400 : 1000;

    // Create canvas
    const canvas = await html2canvas(element, {
      scale: 2, // High resolution
      useCORS: true,
      backgroundColor: "#ffffff",
      logging: false,
      scrollX: 0,
      scrollY: -window.scrollY,
      windowWidth: documentWidth + 100,
      onclone: (clonedDoc) => {
        // Step 0: Remove all same-origin link stylesheets in the cloned document.
        // We already processed and inline-embedded their clean CSS rules as <style> tags,
        // so removing the link tags protects html2canvas from color parsing errors.
        const links = clonedDoc.querySelectorAll("link[rel='stylesheet']");
        links.forEach((linkTag) => {
          const href = linkTag.getAttribute("href");
          if (href && (!href.startsWith("http") || href.includes(window.location.host))) {
            linkTag.remove();
          }
        });

        // Step 1: Replace OKLCH in all cloned <style> tags
        const styles = clonedDoc.querySelectorAll("style");
        styles.forEach((styleTag) => {
          if (styleTag.textContent && (styleTag.textContent.includes("oklch") || styleTag.textContent.includes("oklab"))) {
            styleTag.textContent = replaceOklchInString(styleTag.textContent);
          }
        });

        // Step 2: Replace OKLCH in any cloned inline style properties
        const elementsWithStyle = clonedDoc.querySelectorAll("[style]");
        elementsWithStyle.forEach((el) => {
          const styleAttr = el.getAttribute("style");
          if (styleAttr && (styleAttr.includes("oklch") || styleAttr.includes("oklab"))) {
            const replaced = replaceOklchInString(styleAttr);
            el.setAttribute("style", replaced);
          }
        });

        // Step 3: Align target container constraints and isolate clonedElement
        const clonedElement = clonedDoc.getElementById(elementId);
        if (clonedElement) {
          // Isolate clonedElement by hiding unrelated top-level siblings of body to protect layout size
          const bodyChildren = Array.from(clonedDoc.body.children);
          bodyChildren.forEach((child) => {
            if (child instanceof HTMLElement && !child.contains(clonedElement)) {
              child.style.display = "none";
            }
          });

          // Style body to be wide, clean, and visible
          clonedDoc.body.style.background = "#ffffff";
          clonedDoc.body.style.width = `${documentWidth}px`;
          clonedDoc.body.style.margin = "0";
          clonedDoc.body.style.padding = "20px";
          clonedDoc.body.style.overflow = "visible";

          // Flatten ancestor containers to avoid absolute centering or clipping inside modal view frameworks
          let parent = clonedElement.parentElement;
          while (parent && parent !== clonedDoc.body) {
            parent.style.display = "block";
            parent.style.position = "relative";
            parent.style.maxHeight = "none";
            parent.style.overflow = "visible";
            parent.style.width = "100%";
            parent.style.maxWidth = "none";
            parent.style.margin = "0";
            parent.style.padding = "0";
            parent.style.transform = "none";
            parent = parent.parentElement;
          }

          clonedElement.style.display = "block";
          clonedElement.style.position = "relative";
          clonedElement.style.maxHeight = "none";
          clonedElement.style.overflow = "visible";
          clonedElement.style.padding = "20px";
          clonedElement.style.width = "100%";
          clonedElement.style.maxWidth = "100%";
          clonedElement.style.margin = "0";
          clonedElement.style.boxShadow = "none";
          clonedElement.style.border = "none";
        }
      }
    });

    // Restore original styles of target element
    element.setAttribute("style", originalStyle);
    element.style.maxHeight = originalMaxHeight;
    element.style.overflow = originalOverflow;

    // Calculate dimensions
    const imgWidth = isLandscape ? 297 : 210; // A4 dimensions in mm
    const pageHeight = isLandscape ? 210 : 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let heightLeft = imgHeight;
    let position = 0;

    const opt = {
      orientation: isLandscape ? "l" : "p",
      unit: "mm",
      format: "a4",
      compress: true
    };
    
    const pdf = new jsPDF(opt as any);
    const imgData = canvas.toDataURL("image/jpeg", 0.95);

    // Add first page
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;

    // Handle multi-page overflow
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight, undefined, "FAST");
      heightLeft -= pageHeight;
    }

    if (onProgress) onProgress(true, `در حال فشرده‌سازی و دانلود فایل ${fileName}...`);
    
    pdf.save(`${fileName}.pdf`);
    
    if (onProgress) onProgress(false, "");
  } catch (error) {
    console.error("PDF generation failed:", error);
    if (onProgress) onProgress(false, "");
    alert("بروز خطا در تولید فایل PDF. لطفاً مجدداً تلاش نمایید.");
  } finally {
    // Restore original document styles to prevent layout breakage or flickering in active UI
    originalStylesToRestore.forEach(({ tag, originalText }) => {
      tag.textContent = originalText;
    });
    originalLinksToRestore.forEach(({ tag, disabled }) => {
      tag.disabled = disabled;
    });
    newlyInjectedStyles.forEach((styleTag) => {
      styleTag.remove();
    });
  }
}
