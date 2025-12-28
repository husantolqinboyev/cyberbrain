import { useState, useEffect } from 'react';

// Store original content to detect translation attempts
const originalContentStore = new Map<string, string>();

// Detect if content has been translated
export const detectTranslation = (element: HTMLElement, originalText: string): boolean => {
  if (!element || !originalText) return false;
  
  const currentText = element.textContent?.trim() || '';
  const storedOriginal = originalContentStore.get(element.id || element.className) || originalText;
  
  // Check if text length changed significantly (translation often changes length)
  const lengthDiff = Math.abs(currentText.length - storedOriginal.length);
  const lengthThreshold = storedOriginal.length * 0.3; // 30% difference threshold
  
  // Check for common translation indicators
  const translationIndicators = [
    /\b(translate|tarjima|перевод|çeviri|ترجمة)\b/i,
    /\[translated\]|\[tarjima\]|\[переведено\]|\[çevrildi\]|\[مترجم\]/i,
    /\(translated\)|\(tarjima\)|\(переведено\)|\(çevrildi\)|\(مترجم\)/i
  ];
  
  const hasTranslationIndicators = translationIndicators.some(pattern => 
    currentText.match(pattern) || storedOriginal.match(pattern)
  );
  
  // Check if character composition changed (Unicode manipulation)
  const originalChars = new Set(storedOriginal.split(''));
  const currentChars = new Set(currentText.split(''));
  const charSimilarity = calculateCharSimilarity(originalChars, currentChars);
  
  return (
    lengthDiff > lengthThreshold ||
    hasTranslationIndicators ||
    charSimilarity < 0.7 ||
    currentText !== storedOriginal
  );
};

// Calculate character similarity between two sets
const calculateCharSimilarity = (set1: Set<string>, set2: Set<string>): number => {
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
};

// Store original content
export const storeOriginalContent = (elementId: string, content: string) => {
  originalContentStore.set(elementId, content);
};

// Anti-tampering hook
export const useAntiTampering = (elementIds: string[]) => {
  const [isTampered, setIsTampered] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  useEffect(() => {
    const checkInterval = setInterval(() => {
      const newWarnings: string[] = [];
      let tampered = false;

      elementIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
          const originalText = originalContentStore.get(id) || '';
          if (detectTranslation(element, originalText)) {
            newWarnings.push(`Content tampering detected in element: ${id}`);
            tampered = true;
          }
        }
      });

      setWarnings(newWarnings);
      setIsTampered(tampered);
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [elementIds]);

  const resetContent = (elementId: string) => {
    const element = document.getElementById(elementId);
    const originalText = originalContentStore.get(elementId);
    if (element && originalText) {
      element.textContent = originalText;
    }
  };

  const resetAllContent = () => {
    elementIds.forEach(id => resetContent(id));
  };

  return {
    isTampered,
    warnings,
    resetContent,
    resetAllContent
  };
};

// Prevent copy-paste manipulation
export const preventManipulation = (element: HTMLElement) => {
  // Prevent text selection
  element.style.userSelect = 'none';
  element.style.webkitUserSelect = 'none';
  
  // Prevent right-click context menu
  element.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Prevent drag and drop
  element.addEventListener('dragstart', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Prevent paste
  element.addEventListener('paste', (e) => {
    e.preventDefault();
    return false;
  });
  
  // Prevent certain keyboard shortcuts
  element.addEventListener('keydown', (e) => {
    // Prevent Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
    if ((e.ctrlKey || e.metaKey) && ['a', 'c', 'v', 'x'].includes(e.key.toLowerCase())) {
      e.preventDefault();
      return false;
    }
  });
};

// Monitor DOM changes
export const useDOMObserver = (targetElement: HTMLElement, callback: (mutations: MutationRecord[]) => void) => {
  useEffect(() => {
    if (!targetElement) return;

    const observer = new MutationObserver((mutations) => {
      const textMutations = mutations.filter(mutation => 
        mutation.type === 'childList' || 
        (mutation.type === 'characterData' && mutation.target.nodeType === Node.TEXT_NODE)
      );
      
      if (textMutations.length > 0) {
        callback(textMutations);
      }
    });

    observer.observe(targetElement, {
      childList: true,
      characterData: true,
      subtree: true,
      attributes: false
    });

    return () => observer.disconnect();
  }, [targetElement, callback]);
};

// Validate content integrity
export const validateContentIntegrity = (original: string, current: string): {
  isValid: boolean;
  issues: string[];
} => {
  const issues: string[] = [];
  
  // Check length
  if (Math.abs(original.length - current.length) > original.length * 0.3) {
    issues.push('Significant length change detected');
  }
  
  // Check for translation markers
  const translationMarkers = [
    /\[.*\]/,
    /\(.*\)/,
    /\{.*\}/,
    /translate|tarjima|перевод|çeviri|ترجمة/i
  ];
  
  translationMarkers.forEach(marker => {
    if (marker.test(current) && !marker.test(original)) {
      issues.push('Translation markers detected');
    }
  });
  
  // Check character composition
  const originalChars = new Set(original.split(''));
  const currentChars = new Set(current.split(''));
  const similarity = calculateCharSimilarity(originalChars, currentChars);
  
  if (similarity < 0.7) {
    issues.push('Character composition changed significantly');
  }
  
  return {
    isValid: issues.length === 0,
    issues
  };
};
