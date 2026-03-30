import { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Palette, 
  Type, 
  Ruler, 
  Square, 
  Layers, 
  Copy, 
  CheckCircle2,
  Search,
  Sparkles,
  Send,
  Bot,
  User,
  Layout,
  AlertCircle,
  Info,
  X,
  Code2,
  Wand2,
  Check,
  Figma, 
  Download, 
  Plus,
  Shapes,
  Home,
  Trash2,
  Menu,
  ChevronRight,
  Cpu
} from 'lucide-react';


const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Scope level modul untuk injeksi environment
const GEMINI_MODELS = ['gemini-3-flash-preview','gemini-2.0-flash','gemini-1.5-flash'];

// --- COLOR MATH HELPERS UNTUK GENERATOR TEMA OTOMATIS ---
const hexToHSL = (hex) => {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  let r = parseInt(hex.slice(0, 2), 16) / 255;
  let g = parseInt(hex.slice(2, 4), 16) / 255;
  let b = parseInt(hex.slice(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; } 
  else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
      default: break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const hslToHex = (h, s, l) => {
  l /= 100;
  const a = s * Math.min(l, 1 - l) / 100;
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
};

// Fungsi untuk mengenerate seluruh palet warna dari 1 HEX
const generateColorPalette = (baseHex) => {
  const base = hexToHSL(baseHex);
  
  return [
    {
      collection: 'Primitives / Brand',
      tokens: [
        { name: 'brand/50', value: hslToHex(base.h, base.s, 95), var: 'var(--color-brand-50)' },
        { name: 'brand/100', value: hslToHex(base.h, base.s, 90), var: 'var(--color-brand-100)' },
        { name: 'brand/300', value: hslToHex(base.h, base.s, 70), var: 'var(--color-brand-300)' },
        { name: 'brand/500', value: baseHex, var: 'var(--color-brand-500)' }, // Original Base
        { name: 'brand/700', value: hslToHex(base.h, base.s, 35), var: 'var(--color-brand-700)' },
        { name: 'brand/900', value: hslToHex(base.h, base.s, 20), var: 'var(--color-brand-900)' },
      ]
    },
    {
      collection: 'Primitives / Harmonies (Auto-Generated)',
      tokens: [
        { name: 'harmony/complementary', value: hslToHex((base.h + 180) % 360, base.s, base.l), var: 'var(--color-harmony-complement)', alias: 'Kontras' },
        { name: 'harmony/analogous-1', value: hslToHex((base.h + 30) % 360, base.s, base.l), var: 'var(--color-harmony-analogous-1)', alias: 'Analogous R' },
        { name: 'harmony/analogous-2', value: hslToHex((base.h - 30 + 360) % 360, base.s, base.l), var: 'var(--color-harmony-analogous-2)', alias: 'Analogous L' },
        { name: 'harmony/triadic-1', value: hslToHex((base.h + 120) % 360, base.s, base.l), var: 'var(--color-harmony-triadic-1)', alias: 'Triadic 1' },
        { name: 'harmony/triadic-2', value: hslToHex((base.h + 240) % 360, base.s, base.l), var: 'var(--color-harmony-triadic-2)', alias: 'Triadic 2' },
      ]
    },
    {
      collection: 'Semantic / Action',
      tokens: [
        { name: 'action/primary-bg', value: baseHex, var: 'var(--bg-action-primary)', alias: 'brand/500' },
        { name: 'action/primary-hover', value: hslToHex(base.h, base.s, 35), var: 'var(--bg-action-hover)', alias: 'brand/700' },
        { name: 'action/disabled', value: '#e5e7eb', var: 'var(--bg-action-disabled)', alias: 'neutral/200' },
      ]
    }
  ];
};

// --- DATA MOCK AWAL ---
const defaultColors = generateColorPalette('#3b82f6'); // Blue default
const defaultTypography = [
  { name: 'text-xs', size: '12px', lineHeight: '16px', var: 'var(--text-xs)' },
  { name: 'text-sm', size: '14px', lineHeight: '20px', var: 'var(--text-sm)' },
  { name: 'text-base', size: '16px', lineHeight: '24px', var: 'var(--text-base)' },
  { name: 'text-lg', size: '18px', lineHeight: '28px', var: 'var(--text-lg)' },
  { name: 'text-xl', size: '20px', lineHeight: '28px', var: 'var(--text-xl)' },
  { name: 'text-2xl', size: '24px', lineHeight: '32px', var: 'var(--text-2xl)' },
];
const defaultSpacing = [
  { name: 'space-1', value: '4px', rem: '0.25rem', var: 'var(--space-1)' },
  { name: 'space-2', value: '8px', rem: '0.5rem', var: 'var(--space-2)' },
  { name: 'space-3', value: '12px', rem: '0.75rem', var: 'var(--space-3)' },
  { name: 'space-4', value: '16px', rem: '1rem', var: 'var(--space-4)' },
  { name: 'space-6', value: '24px', rem: '1.5rem', var: 'var(--space-6)' },
  { name: 'space-8', value: '32px', rem: '2rem', var: 'var(--space-8)' },
];
const defaultRadius = [
  { name: 'radius-sm', value: '4px', var: 'var(--radius-sm)', class: 'rounded-sm' },
  { name: 'radius-md', value: '6px', var: 'var(--radius-md)', class: 'rounded-md' },
  { name: 'radius-lg', value: '8px', var: 'var(--radius-lg)', class: 'rounded-lg' },
  { name: 'radius-xl', value: '12px', var: 'var(--radius-xl)', class: 'rounded-xl' },
  { name: 'radius-full', value: '9999px', var: 'var(--radius-full)', class: 'rounded-full' },
];

const callGeminiAPI = async (payload) => {
  let response;
  let lastErrorText = '';
  const delays = [1000, 2000, 4000, 8000, 16000];
  
  for (let i = 0; i < 6; i++) {
    try {
      const model = payload.model || 'gemini-3-flash-preview';
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (response.ok) return await response.json();
      lastErrorText = await response.text();
      if (response.status >= 400 && response.status < 500 && response.status !== 429) break;
    } catch(err) {
      lastErrorText = err.message;
      if (i === 5) throw err;
    }
    if (i < 5) await new Promise(r => setTimeout(r, delays[i]));
  }
  throw new Error(`API Error ${response?.status || 'Unknown'}: ${lastErrorText || 'Network Error'}`);
};

const setNestedObject = (obj, path, value) => {
  const keys = path.split('/');
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
};

const hexToFigmaRgb = (hex) => {
  let r = 0, g = 0, b = 0;
  if (!hex || typeof hex !== 'string') return [0, 0, 0];
  const cleanHex = hex.startsWith('#') ? hex.substring(1) : hex;
  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16);
    g = parseInt(cleanHex[1] + cleanHex[1], 16);
    b = parseInt(cleanHex[2] + cleanHex[2], 16);
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.substring(0, 2), 16);
    g = parseInt(cleanHex.substring(2, 4), 16);
    b = parseInt(cleanHex.substring(4, 6), 16);
  }
  return [r / 255, g / 255, b / 255];
};

const xmlEscape = (str) => {
  if (typeof str !== 'string') return String(str || '');
  return str.replace(/[<>&"']/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '"': return '&quot;';
      case "'": return '&apos;';
      default: return c;
    }
  });
};

const stitchSvgWithDRD = (baseSvg, drd) => {
  if (!drd || typeof drd !== 'object') return baseSvg;
  
  try {
    // 1. Bersihkan SVG dasar
    let svgContent = (baseSvg || '').trim()
      .replace(/^```[a-z]*\n/i, '')
      .replace(/\n```$/i, '')
      .replace(/^<\?xml.*?\?>/i, '')
      .replace(/^<!DOCTYPE.*?>/i, '');
    
    const startTagMatch = svgContent.match(/<svg[^>]*>/i);
    const endTagIndex = svgContent.lastIndexOf('</svg>');
    
    let innerContent = '';
    if (startTagMatch && endTagIndex !== -1) {
      const startTagEndIndex = startTagMatch.index + startTagMatch[0].length;
      innerContent = svgContent.substring(startTagEndIndex, endTagIndex).trim();
    } else {
      innerContent = svgContent;
    }

    // 2. Siapkan data dokumentasi
    const obj = xmlEscape(drd.objective);
    const rat = xmlEscape(drd.rationale);
    const acc = xmlEscape(drd.accessibility);
    const beh = xmlEscape(drd.behavior);
    const tok = xmlEscape(Array.isArray(drd.tokens_used) ? drd.tokens_used.join(', ') : (drd.tokens_used || ''));

    const wrap = (text, x, lineHeight, maxChars) => {
      const words = text.split(' ');
      let lines = [];
      let currentLine = '';
      words.forEach(word => {
        if ((currentLine + word).length > maxChars) {
          if (currentLine) lines.push(currentLine.trim());
          currentLine = word + ' ';
        } else {
          currentLine += word + ' ';
        }
      });
      if (currentLine) lines.push(currentLine.trim());
      return lines.map((line, i) => 
        `<tspan x="${x}" dy="${i === 0 ? 0 : lineHeight}">${line}</tspan>`
      ).join('');
    };

    // Ambil viewBox atau dimensi untuk centering
    let vb = [0, 0, 800, 600]; // Default
    if (startTagMatch) {
      const vbMatch = startTagMatch[0].match(/viewBox=["']([^"']+)["']/i);
      if (vbMatch) {
        vb = vbMatch[1].split(/[\s,]+/).map(Number);
      } else {
        const wMatch = startTagMatch[0].match(/width=["'](\d+)["']/i);
        const hMatch = startTagMatch[0].match(/height=["'](\d+)["']/i);
        if (wMatch && hMatch) vb = [0, 0, Number(wMatch[1]), Number(hMatch[1])];
      }
    }

    const compW = vb[2] || 800;
    const compH = vb[3] || 600;
    const scale = Math.min(680 / compW, 440 / compH, 1);
    const offsetX = (720 - (compW * scale)) / 2;
    const offsetY = (480 - (compH * scale)) / 2;

    // 4. Rakit SVG final (Layout Screenshot)
    return `<svg width="800" height="1200" viewBox="0 0 800 1200" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <rect width="800" height="1200" fill="white" />
  
  <!-- SHOWCASE AREA -->
  <rect x="40" y="40" width="720" height="480" fill="#f3f4f6" rx="12" />
  <g transform="translate(40, 40)">
     <g transform="translate(${offsetX}, ${offsetY}) scale(${scale})">
        ${innerContent}
     </g>
  </g>

  <!-- DOCUMENTATION AREA -->
  <g transform="translate(40, 560)">
    <rect width="720" height="600" fill="white" rx="32" stroke="#f1f5f9" stroke-width="1" />
    <text x="32" y="45" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="bold" fill="#3B82F6" letter-spacing="0.5">DESIGN REQUIREMENT DOCUMENT</text>
    <line x1="32" y1="65" x2="688" y2="65" stroke="#f1f5f9" stroke-width="1" />
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#94A3B8" x="32" y="100">OBJECTIVE &amp; DESIGN RATIONALE</text>
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#1e293b" x="32" y="130">
      ${wrap(obj, 32, 24, 55)}
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#64748b" font-style="italic" x="32" y="240">
      ${wrap(rat, 32, 18, 80)}
    </text>
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#94A3B8" x="32" y="400">ACCESSIBILITY (WCAG) / INTERACTION BEHAVIOR</text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569" x="32" y="425">
      ${wrap(acc, 32, 20, 35)}
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569" x="380" y="425">
      ${wrap(beh, 380, 20, 35)}
    </text>
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#94A3B8" x="32" y="520">DESIGN SYSTEM TOKENS</text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#3B82F6" font-weight="semibold" x="32" y="545">${tok}</text>
  </g>
  
  <text x="40" y="1180" font-family="Arial, sans-serif" font-size="10" fill="#94A3B8">Generated by dsm-sid AI Assistant</text>
</svg>`.trim();
  } catch (e) {
    console.error("SVG Stitching error:", e);
    return baseSvg;
  }
};

const generateTokensJSON = (designVariables) => {
  const tokens = {};
  
  // Helper to create token object
  const createToken = (type, value, extraExtensions = {}) => ({
    "$type": type,
    "$value": value,
    "$extensions": {
      "com.figma.scopes": ["ALL_SCOPES"],
      "com.figma.isOverride": true,
      ...extraExtensions
    }
  });

  designVariables.colors.forEach(group => {
    group.tokens.forEach(t => {
      const rgb = hexToFigmaRgb(t.value);
      const tokenVal = {
        "colorSpace": "srgb",
        "components": rgb,
        "alpha": 1,
        "hex": t.value.toUpperCase()
      };
      
      // Handle alias if needed (Figma variables use a different syntax for aliases in JSON, but we'll stick to value for now)
      setNestedObject(tokens, `${group.collection}/${t.name}`, createToken("color", tokenVal));
    });
  });

  designVariables.spacing.forEach(t => { 
    const numValue = parseFloat(t.value) || 0;
    setNestedObject(tokens, `Spacing/${t.name}`, createToken("number", numValue)); 
  });

  designVariables.radius.forEach(t => { 
    const numValue = parseFloat(t.value) || 0;
    setNestedObject(tokens, `Radius/${t.name}`, createToken("number", numValue)); 
  });

  designVariables.typography.forEach(t => {
     setNestedObject(tokens, `Typography/${t.name}`, createToken("typography", {
       fontSize: parseFloat(t.size) || 0, 
       lineHeight: t.lineHeight, 
       fontFamily: "Inter", 
       fontWeight: "Regular"
     }));
  });

  // Global extensions
  tokens["$extensions"] = {
    "com.figma.modeName": "Mode 1"
  };

  return JSON.stringify(tokens, null, 2);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('ai');
  const [copiedVar, setCopiedVar] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Show sidebar on load
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false); 
  // const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState(null);
  
  // --- STATE UNTUK MULTI-BRAND THEMING ---
  const [brands, setBrands] = useState([
    { id: 'brand-1', name: 'Brand - 1 (Default)', colors: defaultColors, primaryHex: '#3b82f6' }
  ]);
  const [activeBrandId, setActiveBrandId] = useState('brand-1');
  
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [brandCreationMode, setBrandCreationMode] = useState('manual'); // 'manual' | 'ai'
  const [newBrandName, setNewBrandName] = useState('Brand - 2');
  const [newBrandHex, setNewBrandHex] = useState('#8b5cf6');
  
  // --- NEW STATE UNTUK AI BRAND GENERATOR ---
  const [aiBrandPrompt, setAiBrandPrompt] = useState('');
  const [isGeneratingBrand, setIsGeneratingBrand] = useState(false);
  const [generatedBrandData, setGeneratedBrandData] = useState(null);

  // Derive current variables based on active brand
  const activeBrand = useMemo(() => brands.find(b => b.id === activeBrandId) || brands[0], [brands, activeBrandId]);
  
  const currentDesignVariables = useMemo(() => ({
    colors: activeBrand.colors,
    typography: defaultTypography,
    spacing: defaultSpacing,
    radius: defaultRadius
  }), [activeBrand]);

  // Helpers to get specific colors for dynamic components rendering
  const getVar = (name) => {
    for (const group of currentDesignVariables.colors) {
      const token = group.tokens.find(t => t.name === name);
      if (token) return token.value;
    }
    return '#000000';
  };
  
  const cPrimary = getVar('brand/500');
  const cPrimaryHover = getVar('brand/700');
  const cPrimaryActive = getVar('brand/900');
  const cPrimaryLight = getVar('brand/50');
  const cPrimaryLightBorder = getVar('brand/100');
  
  const borderRadius = currentDesignVariables.radius.find(r => r.name === 'radius-lg')?.value.replace('px', '') || '12';
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [tokensJSON, setTokensJSON] = useState('');

  // --- STATE UNTUK EKSPOR PROMPT AI ---
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');

  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const chatEndRef = useRef(null);

  const [modalPrompt, setModalPrompt] = useState('');
  const [isGeneratingModal, setIsGeneratingModal] = useState(false);
  const [modalData, setModalData] = useState({
    title: "Hapus Proyek",
    body: "Apakah Anda yakin ingin menghapus proyek ini? Semua data Anda akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.",
    primaryButtonText: "Hapus Proyek",
    secondaryButtonText: "Batal",
    intent: "danger"
  });

  const [linterInput, setLinterInput] = useState('<!-- Contoh kode mentah -->\n<button style="background-color: #3b82f6; border-radius: 6px; padding: 12px 24px;">\n  Simpan Data\n</button>');
  const [linterOutput, setLinterOutput] = useState('');
  const [isLinting, setIsLinting] = useState(false);

  // --- STATE UNTUK AI COMPONENT GENERATOR ---
  const [aiCompPrompt, setAiCompPrompt] = useState('');
  const [isGeneratingComp, setIsGeneratingComp] = useState(false);
  const [generatedComp, setGeneratedComp] = useState(null);

  // --- NEW STATE UNTUK AI ICON GENERATOR ---
  const [iconPrompt, setIconPrompt] = useState('');
  const [isGeneratingIcons, setIsGeneratingIcons] = useState(false);
  const [generatedIcons, setGeneratedIcons] = useState(null); // { title, svg }
  const [showAiCodeModal, setShowAiCodeModal] = useState(false);
  const [activeModel, setActiveModel] = useState(GEMINI_MODELS[0]);

  const [compSubTab, setCompSubTab] = useState('figma'); 
  const [framework, setFramework] = useState('react'); 

  useEffect(() => {
    if (chatEndRef.current && activeTab === 'ai') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleCopy = async (text, id = text) => {
    // Ensure SVG has proper xmlns for Figma compatibility
    let content = text;
    if (content.trim().startsWith('<svg') && !content.includes('xmlns=')) {
      content = content.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    const onSuccess = () => {
      setCopiedVar(id);
      setTimeout(() => setCopiedVar(null), 2000);
    };

    // Strategy 1: Modern Clipboard API with ClipboardItem (best for Figma)
    const tryClipboardWrite = async () => {
      if (typeof ClipboardItem === 'undefined') return false;
      try {
        const items = {};
        // Figma reads SVG from text/plain
        items['text/plain'] = new Blob([content], { type: 'text/plain' });
        // Also provide text/html for other apps
        if (content.trim().startsWith('<svg')) {
          items['text/html'] = new Blob([content], { type: 'text/html' });
        }
        await navigator.clipboard.write([new ClipboardItem(items)]);
        return true;
      } catch {
        return false;
      }
    };

    // Strategy 2: Simple writeText (works on most browsers)
    const tryClipboardWriteText = async () => {
      try {
        await navigator.clipboard.writeText(content);
        return true;
      } catch {
        return false;
      }
    };

    // Strategy 3: execCommand fallback using contenteditable div (preserves rich content)
    const tryExecCommand = () => {
      try {
        const div = document.createElement('div');
        div.contentEditable = 'true';
        div.style.position = 'fixed';
        div.style.left = '-9999px';
        div.style.top = '-9999px';
        div.style.opacity = '0';
        
        if (content.trim().startsWith('<svg')) {
          // For SVG: put raw text so Figma can parse it
          div.textContent = content;
        } else {
          div.textContent = content;
        }
        
        document.body.appendChild(div);
        
        const range = document.createRange();
        range.selectNodeContents(div);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        
        const success = document.execCommand('copy');
        selection.removeAllRanges();
        document.body.removeChild(div);
        return success;
      } catch {
        return false;
      }
    };

    // Try each strategy in order
    if (await tryClipboardWrite()) { onSuccess(); return; }
    if (await tryClipboardWriteText()) { onSuccess(); return; }
    if (tryExecCommand()) { onSuccess(); return; }
    
    // All strategies failed
    alert("Gagal menyalin ke clipboard. Pastikan browser memberikan izin clipboard.");
  };

  const resetAddBrandModal = () => {
    setShowAddBrandModal(false);
    setBrandCreationMode('manual');
    setAiBrandPrompt('');
    setGeneratedBrandData(null);
  };

  const handleAddBrand = (e) => {
    if (e) e.preventDefault();
    const hexToUse = brandCreationMode === 'ai' && generatedBrandData ? generatedBrandData.primaryHex : newBrandHex;
    const nameToUse = brandCreationMode === 'ai' && generatedBrandData ? generatedBrandData.brandName : newBrandName;

    if (!/^#[0-9A-F]{6}$/i.test(hexToUse)) {
      alert("Format warna HEX tidak valid (Gunakan #RRGGBB)");
      return;
    }
    
    const newId = `brand-${Date.now()}`;
    const newBrand = {
      id: newId,
      name: nameToUse,
      colors: generateColorPalette(hexToUse),
      primaryHex: hexToUse
    };
    
    setBrands([...brands, newBrand]);
    setActiveBrandId(newId);
    resetAddBrandModal();
    setNewBrandName(`Brand - ${brands.length + 2}`);
  };

  // --- NEW HANDLER: AI BRAND GENERATOR ---
  const generateBrandWithAI = async () => {
    if (!aiBrandPrompt.trim()) return;
    setIsGeneratingBrand(true);
    setGeneratedBrandData(null);

    const payload = {
      contents: [{ role: "user", parts: [{ text: `Buatkan identitas visual utama untuk produk/aplikasi dengan deskripsi berikut: ${aiBrandPrompt}` }] }],
      systemInstruction: { parts: [{ text: "Anda adalah UI/UX Expert dan Brand Designer. Berdasarkan deskripsi dari pengguna, pilihkan NAMA BRAND yang cocok dan WARNA UTAMA (Primary Color) dalam format HEX. Berikan alasan psikologis singkat mengapa warna tersebut sangat cocok." }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            brandName: { type: "STRING", description: "Nama brand yang catchy dan sesuai dengan deskripsi" },
            primaryHex: { type: "STRING", description: "Kode warna HEX yang valid, lengkap dengan tanda #, contoh: #3B82F6" },
            rationale: { type: "STRING", description: "Alasan psikologi warna mengapa warna ini cocok (1-2 kalimat pendek)" }
          },
          required: ["brandName", "primaryHex", "rationale"]
        }
      }
    };

    try {
      const data = await callGeminiAPI(payload);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        setGeneratedBrandData(JSON.parse(textResponse));
      }
    } catch (error) {
      alert("Gagal mengenerate brand menggunakan AI. Silakan coba lagi.");
    } finally {
      setIsGeneratingBrand(false);
    }
  };

  const openExportModal = () => {
    setTokensJSON(generateTokensJSON(currentDesignVariables));
    setShowExportModal(true);
  };

  const openAIPromptModal = () => {
    const json = generateTokensJSON(currentDesignVariables);
    const prompt = `${json}`;
    
    setAiPromptText(prompt);
    setShowAIPromptModal(true);
  };

  const downloadJSON = () => {
    const blob = new Blob([tokensJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "design-system.tokens.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'ai', label: 'Introduction', icon: Home, group: 'GENERAL' },
    { id: 'colors', label: 'Colors', icon: Palette, group: 'FOUNDATION' },
    { id: 'typography', label: 'Typography', icon: Type, group: 'FOUNDATION' },
    { id: 'spacing', label: 'Spacing', icon: Ruler, group: 'FOUNDATION' },
    { id: 'radius', label: 'Radius', icon: Square, group: 'FOUNDATION' },
    { id: 'tokens', label: 'Tokens', icon: Layers, group: 'FOUNDATION' },
    { id: 'components', label: 'Buttons', icon: Layout, group: 'COMPONENTS' },
    { id: 'patterns', label: 'Patterns', icon: Shapes, group: 'COMPONENTS' },
    { id: 'icon-gen', label: 'Icon Generator', icon: Shapes, group: 'COMPONENTS' },
    { id: 'ai-gen', label: 'Component Generator', icon: Cpu, group: 'COMPONENTS' },
    { id: 'resources', label: 'Resources', icon: Download, group: 'TOOLS' },
  ];

  const ComponentPreview = ({ title, figmaSvg, children, id, isBlock = false, name, type }) => (
    <div 
      className={`relative group ${isBlock ? 'w-full' : ''} cursor-pointer`}
      onClick={() => {
        if (name) {
          setSelectedComponent({ name, type, id });
        }
      }}
    >
      {title && <div className="text-xs text-gray-500 font-medium mb-3">{title}</div>}
      <div className={`relative ${isBlock ? 'block h-full' : 'inline-block'}`}>
        {children}
        <div className={`absolute -inset-2 border-2 border-transparent group-hover:border-indigo-500/20 rounded-xl transition-all ${selectedComponent?.id === id ? 'border-indigo-500 shadow-[0_0_0_4px_rgba(79,70,229,0.1)]' : ''}`}></div>
        {figmaSvg && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none flex flex-col items-center">
             <button 
               onClick={(e) => {
                 e.stopPropagation();
                 handleCopy(figmaSvg, id);
               }}
               className="pointer-events-auto whitespace-nowrap relative bg-gray-900/95 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-800 shadow-xl border border-gray-700 transform translate-y-2 group-hover:translate-y-0 transition-all"
               title="Paste langsung di Figma (Ctrl+V)"
             >
               {copiedVar === id ? <CheckCircle2 size={14} className="text-green-400"/> : <Figma size={14} className="text-pink-400" />}
               {copiedVar === id ? 'Tersalin' : 'Copy to Figma'}
             </button>
             <div className="w-2 h-2 bg-gray-900/95 rotate-45 -mt-1 border-b border-r border-gray-700 pointer-events-none transform translate-y-2 group-hover:translate-y-0 transition-all"></div>
          </div>
        )}
      </div>
    </div>
  );

  const CodePreviewCard = ({ title, codes, preview, id, currentFramework }) => {
    const code = codes[currentFramework] || codes['react'];
    const fwBadges = {
      'react': <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-md font-medium">React + Tailwind</span>,
      'angular': <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-md font-medium">Angular + Tailwind</span>,
      'bootstrap': <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-md font-medium">Bootstrap 5</span>,
      'flutter': <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs rounded-md font-medium">Flutter / Dart</span>,
      'android': <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-md font-medium">Jetpack Compose</span>,
      'ios': <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-md font-medium">SwiftUI</span>
    };

    return (
      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm mb-8">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <span className="font-semibold text-gray-800 text-sm">{title}</span>
          <div className="flex gap-2">{fwBadges[currentFramework]}</div>
        </div>
        <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50 border-b border-gray-200 min-h-[160px]">
          {preview}
        </div>
        <div className="relative">
          <div className="absolute top-3 right-3">
            <button onClick={() => handleCopy(code, `code-fw-${id}-${currentFramework}`)} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded-md text-xs transition-colors flex items-center gap-1">
              {copiedVar === `code-fw-${id}-${currentFramework}` ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
              {copiedVar === `code-fw-${id}-${currentFramework}` ? 'Tersalin' : 'Salin Kode'}
            </button>
          </div>
          <pre className="p-4 pt-10 bg-gray-900 text-gray-100 text-sm overflow-x-auto font-mono"><code>{code}</code></pre>
        </div>
      </div>
    );
  };

  const generateModalCopy = async () => {
    if (!modalPrompt.trim()) return;
    setIsGeneratingModal(true);
    const payload = {
      contents: [{ role: "user", parts: [{ text: `Buatkan salinan/copy untuk modal UI dengan skenario: ${modalPrompt}` }] }],
      systemInstruction: { parts: [{ text: "Anda adalah UX Copywriter profesional. Buatlah teks untuk komponen Modal (dialog). Gunakan Bahasa Indonesia yang jelas, ringkas, dan sesuai konteks." }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" }, body: { type: "STRING" }, primaryButtonText: { type: "STRING" }, secondaryButtonText: { type: "STRING" },
            intent: { type: "STRING", description: "HANYA pilih salah satu: 'danger', 'success', 'warning', atau 'info'" }
          },
          required: ["title", "body", "primaryButtonText", "secondaryButtonText", "intent"]
        }
      }
    };
    try {
      const data = await callGeminiAPI(payload);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) { setModalData(JSON.parse(textResponse)); setModalPrompt(''); }
    } catch (error) { alert("Gagal menghasilkan teks menggunakan AI. Silakan coba lagi."); } finally { setIsGeneratingModal(false); }
  };

  const runTokenLinter = async () => {
    if (!linterInput.trim()) return;
    setIsLinting(true); setLinterOutput('');
    const systemPrompt = `Anda adalah Design System Code Linter. Format jawaban Anda dalam Bahasa Indonesia menggunakan Markdown. Rekomendasikan variabel CSS dari Design System pengguna ini: ${JSON.stringify(currentDesignVariables)}`;
    const payload = { contents: [{ role: "user", parts: [{ text: `Tolong periksa kode ini:\n\n${linterInput}` }] }], systemInstruction: { parts: [{ text: systemPrompt }] } };
    try {
      const data = await callGeminiAPI(payload);
      setLinterOutput(data.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada saran linter.");
    } catch (error) { setLinterOutput("⚠️ Terjadi kesalahan saat menganalisis kode. Silakan coba lagi."); } finally { setIsLinting(false); }
  };

  const handleAISubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    const userText = inputValue;
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setInputValue(''); setIsLoadingChat(true);

    try {
      const systemPrompt = `Anda adalah asisten UI/UX Design System yang proaktif. Jawab dalam Bahasa Indonesia.
      Sistem desain saat ini: ${JSON.stringify(currentDesignVariables)}
      
      Jika pengguna meminta untuk membuat komponen UI, Anda HARUS menyertakan blok kode JSON khusus di dalam jawaban Anda dengan format seperti ini:
      
      \`\`\`json
      {
        "type": "component_card",
        "title": "Nama Komponen",
        "drd": {
          "objective": "Tujuan utama komponen",
          "rationale": "Alasan pemilihan desain dan estetika",
          "tokens_used": ["token-1", "token-2"],
          "accessibility": "Catatan aksesibilitas (W3C)",
          "behavior": "Cara interaksi"
        },
        "svg": "<svg>...</svg>",
        "code": "/* Kode React + Tailwind */"
      }
      \`\`\`
      
      PENTING: 
      - SVG harus valid dan bisa langsung di-copy-paste ke Figma.
      - SVG komponen harus memiliki viewBox yang LEBAR (misal: 0 0 600 400) dan teks harus dibungkus (wrap) agar TIDAK terpotong.
      - Berikan Mini DRD (Design Requirement Document) dalam format JSON.
      - Kode React harus menggunakan Tailwind CSS.
      - Berikan penjelasan singkat sebelum atau sesudah blok JSON tersebut.`;

      const validHistory = messages.slice(1).filter(msg => !msg.content.startsWith('⚠️'));
      const contents = []; let lastRole = null;
      for (const msg of validHistory) {
        const currentRole = msg.role === 'model' ? 'model' : 'user';
        if (currentRole !== lastRole) { contents.push({ role: currentRole, parts: [{ text: msg.content }] }); lastRole = currentRole; } 
        else { if (contents.length > 0) contents[contents.length - 1].parts[0].text += '\n\n' + msg.content; }
      }
      if (lastRole === 'user' && contents.length > 0) { contents[contents.length - 1].parts[0].text += '\n\n' + userText; } 
      else { contents.push({ role: 'user', parts: [{ text: userText }] }); }

      const payload = { 
        model: activeModel,
        contents, 
        systemInstruction: { parts: [{ text: systemPrompt }] } 
      };
      const data = await callGeminiAPI(payload);
      const modelText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf, saya tidak dapat menghasilkan tanggapan.";
      setMessages(prev => [...prev, { role: 'model', content: modelText }]);
    } catch (error) { setMessages(prev => [...prev, { role: 'model', content: `⚠️ Kesalahan menghubungkan ke AI: ${error.message}. Silakan coba lagi nanti.` }]); } finally { setIsLoadingChat(false); }
  };

  const generateComponentWithAI = async () => {
    if (!aiCompPrompt.trim()) return;
    setIsGeneratingComp(true);
    setGeneratedComp(null);

    const payload = {
      model: activeModel,
      contents: [{ 
        role: "user", 
        parts: [{ text: `Buatkan komponen UI berdasarkan deskripsi ini: ${aiCompPrompt}` }] 
      }],
      systemInstruction: { 
        parts: [{ text: `Anda adalah UI/UX Expert dan Senior Frontend Developer. 
        Gunakan Design System berikut: ${JSON.stringify(currentDesignVariables)}
        
        Tugas Anda:
        1. Buat kode SVG yang valid dan INDAH untuk komponen tersebut.
           - Gunakan font-family="Inter, sans-serif".
           - SVG ini harus terlihat profesional saat di-paste ke Figma.
        2. Buat MINI DESIGN REQUIREMENT DOCUMENT (DRD) yang mencakup: Objective, Rationale, Tokens Used, Accessibility, dan Behavior.
        3. Buat kode React + Tailwind CSS untuk komponen tersebut.
           - Gunakan Lucide icons jika perlu.
           - Gunakan variabel CSS dari design system (misal: var(--color-brand-500)).
        
        Patuhi aturan:
        - JANGAN memberikan teks penjelasan, HANYA JSON.
        - Output JSON harus memuat: title, drd (object), svg, code.
        
        Format:
        { "title": "...", "drd": { "objective": "...", "rationale": "...", "tokens_used": [], "accessibility": "...", "behavior": "..." }, "svg": "<svg>...</svg>", "code": "..." }` }] 
      },
      generationConfig: {
        responseMimeType: "application/json"
      }
    };

    try {
      const data = await callGeminiAPI(payload);
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (textResponse) {
        setGeneratedComp(JSON.parse(textResponse));
      }
    } catch (error) { setGeneratedComp(null); alert(`Gagal generate komponen: ${error.message}`); } finally { setIsGeneratingComp(false); }
  };

  const generateIconsWithAI = async () => {
    if (!iconPrompt.trim()) return;
    setIsGeneratingIcons(true);
    setGeneratedIcons(null);

    try {
      const systemPrompt = `Anda adalah Icon Designer professional. Buatlah icon SVG yang bersih, minimalis, dan modern.
      Aturan SVG:
      - Gunakan stroke-width="2"
      - Gunakan stroke="currentColor" dan fill="none" (kecuali jika icon memang memerlukan fill)
      - Pastikan viewBox="0 0 24 24"
      - JANGAN berikan atribut width/height di dalam tag <svg> (biarkan fleksibel)
      - Icon harus terlihat bagus di Figma.

      Output harus dalam format JSON:
      { 
        "title": "Nama Icon", 
        "svg": "<path ... />",
        "drd": {
          "objective": "Deskripsi singkat tujuan icon",
          "rationale": "Alasan pemilihan bentuk/visual",
          "accessibility": "Instruksi label aria atau penggunaan warna"
        }
      }
      Catatan: "svg" hanya berisi tag path/circle/dll di DALAM <svg>, BUKAN tag <svg> itu sendiri.`;

      const payload = {
        model: activeModel,
        contents: [{ role: "user", parts: [{ text: `Buatkan icon untuk: ${iconPrompt}` }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] }
      };

      const data = await callGeminiAPI(payload);
      const jsonStr = data.candidates?.[0]?.content?.parts?.[0]?.text;
      const parsed = JSON.parse(jsonStr.replace(/```json\n?/, '').replace(/\n?```/, ''));

      setGeneratedIcons(parsed);
    } catch (error) {
      alert(`Gagal generate icon: ${error.message}`);
    } finally {
      setIsGeneratingIcons(false);
    }
  };

  const formatMessage = (text) => {
    if (!text) return null;
    const parts = text.split(/(```(?:json)?[\s\S]*?```)/g);
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        const rawContent = part.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
        
        // Cek apakah ini adalah component card JSON
        try {
          const parsed = JSON.parse(rawContent);
          if (parsed && parsed.type === 'component_card') {
            return (
              <div key={index} className="my-6 w-full animate-in zoom-in-95 duration-300">
                <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                       <Figma size={14} className="text-pink-500" /> {parsed.title}
                    </span>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const fullSvg = stitchSvgWithDRD(parsed.svg, parsed.drd, parsed.title);
                          handleCopy(fullSvg, `chat-copy-figma-${index}`);
                        }}
                        className="text-[10px] bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-1.5"
                      >
                        {copiedVar === `chat-copy-figma-${index}` ? <CheckCircle2 size={12} className="text-green-500" /> : <Figma size={12} className="text-pink-500" />}
                        COPY TO FIGMA
                      </button>
                      <button 
                        onClick={() => {
                          setGeneratedComp({ title: parsed.title, drd: parsed.drd, svg: parsed.svg, code: parsed.code });
                          setShowAiCodeModal(true);
                        }}
                        className="text-[10px] bg-blue-600 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm"
                      >
                        VIEW CODE
                      </button>
                    </div>
                  </div>
                  <div className="p-12 flex flex-col items-center bg-[#f3f4f6]/80 relative overflow-hidden min-h-[400px] justify-center">
                    <div className="w-full overflow-x-auto pt-10 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                      <ComponentPreview id={`chat-svg-${index}`} figmaSvg={stitchSvgWithDRD(parsed.svg, parsed.drd, parsed.title)}>
                        <div className="flex flex-col items-center min-w-max px-4">
                          <div 
                            className="bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-100" 
                            dangerouslySetInnerHTML={{ __html: parsed.svg }} 
                          />
                        </div>
                      </ComponentPreview>
                    </div>
                  </div>
                  {parsed.drd && (
                    <div className="px-8 py-12 bg-white border-t border-gray-100">
                      <div className="w-full bg-[#f8fafc] border border-gray-100/50 rounded-[28px] p-10 shadow-sm">
                        <h5 className="text-lg font-bold text-blue-500 mb-8 border-b border-gray-100/50 pb-5">
                          DESIGN REQUIREMENT DOCUMENT
                        </h5>
                        <div className="space-y-12">
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">OBJECTIVE & DESIGN RATIONALE</span>
                            <p className="text-xl text-gray-900 font-bold leading-tight mb-3">
                              {parsed.drd.objective}
                            </p>
                            {parsed.drd.rationale && (
                              <p className="text-sm text-gray-500 italic leading-relaxed">
                                {parsed.drd.rationale}
                              </p>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-8">
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">ACCESSIBILITY (WCAG)</span>
                              <p className="text-sm text-gray-600 leading-relaxed">{parsed.drd.accessibility}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">INTERACTION BEHAVIOR</span>
                              <p className="text-sm text-gray-600 leading-relaxed">{parsed.drd.behavior}</p>
                            </div>
                          </div>
                          
                          <div>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">DESIGN SYSTEM TOKENS</span>
                            <p className="text-sm text-blue-500 font-semibold">
                              {(parsed.drd.tokens_used || []).join(', ')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-center">
                    <p className="text-[10px] text-gray-400 italic">Copy to Figma enabled • Click View Code for React source</p>
                  </div>
                </div>
              </div>
            );
          }
        } catch (e) {
          // Bukan JSON kartu komponen, lanjut sebagai blok kode biasa
        }

        const code = rawContent;
        return (
          <div key={index} className="relative mt-2 mb-4 group">
             <div className="absolute top-2 right-2 flex gap-2">
                <button onClick={() => handleCopy(code, `code-${index}`)} className="bg-gray-700 hover:bg-gray-600 text-white p-1.5 rounded-md text-xs transition-colors flex items-center gap-1">
                  {copiedVar === `code-${index}` ? <CheckCircle2 size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copiedVar === `code-${index}` ? 'Salin' : 'Salin Kode'}
                </button>
             </div>
             <pre className="bg-gray-800 text-gray-100 p-4 pt-10 rounded-xl overflow-x-auto text-sm border border-gray-700 shadow-inner"><code>{code}</code></pre>
          </div>
        );
      }
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const renderColors = () => (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      
      {/* BRAND HUB - Premium Selection */}
      <div className="bg-white/40 backdrop-blur-md p-2 rounded-[28px] border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.02)] flex flex-wrap items-center gap-2 max-w-fit mx-auto lg:mx-0">
        {brands.map(brand => (
          <button
            key={brand.id}
            onClick={() => setActiveBrandId(brand.id)}
            className={`group flex items-center gap-3 px-5 py-3 rounded-[22px] transition-all duration-500 ${
              activeBrandId === brand.id 
                ? 'bg-white text-gray-900 shadow-[0_10px_25px_rgba(0,0,0,0.06)] border border-gray-100 scale-100' 
                : 'text-gray-500 hover:text-gray-800 hover:bg-white/50 scale-95 opacity-70 hover:opacity-100'
            }`}
          >
            <div className="w-5 h-5 rounded-lg shadow-inner ring-2 ring-white transition-transform group-hover:scale-110" style={{ backgroundColor: brand.primaryHex }}></div>
            <span className="text-sm font-black tracking-tight">{brand.name}</span>
          </button>
        ))}
        <div className="w-px h-8 bg-gray-200/50 mx-2 hidden sm:block" />
        <button 
          onClick={() => setShowAddBrandModal(true)}
          className="p-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-[20px] transition-all shadow-lg shadow-indigo-500/20 active:scale-90"
          title="Add New Brand"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {currentDesignVariables.colors.map((group, idx) => (
          <section key={idx} className="relative">
            <div className="flex items-center gap-4 mb-8">
              <div className="w-1.5 h-8 bg-indigo-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight capitalize">{group.collection}</h3>
              <div className="flex-grow h-px bg-gradient-to-r from-gray-200 to-transparent"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {group.tokens.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
                <div 
                  key={token.name} 
                  className="group bg-white rounded-[24px] border border-gray-100 p-5 hover:shadow-[0_22px_45px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-500 flex flex-col gap-4"
                >
                  <div className="relative">
                    <div className="w-full h-32 rounded-[18px] shadow-inner transition-transform duration-500 group-hover:scale-[1.02]" style={{ backgroundColor: token.value }} />
                    <button 
                      onClick={() => handleCopy(token.var)} 
                      className="absolute bottom-3 right-3 p-2.5 bg-white/90 backdrop-blur-sm text-gray-500 hover:text-indigo-600 rounded-xl shadow-lg opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 active:scale-90"
                    >
                      {copiedVar === token.var ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
                    </button>
                  </div>

                  <div className="px-1">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-bold text-gray-900 text-sm tracking-tight truncate">{token.name}</h4>
                      <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{token.value.replace('#','')}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono truncate opacity-60 group-hover:opacity-100 transition-opacity">
                      {token.var}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );

  const renderTypography = () => (
    <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {currentDesignVariables.typography.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
        <div key={token.name} className="group bg-white rounded-3xl border border-gray-100 p-8 hover:shadow-[0_25px_60px_rgba(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-500 flex flex-col md:flex-row md:items-center gap-10 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 rounded-bl-[100px] -z-0 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="w-full md:w-64 flex-shrink-0 relative z-10">
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 block">Token Name</span>
            <div className="font-mono text-sm text-gray-900 font-bold mb-4">{token.name}</div>
            
            <div className="flex flex-wrap gap-4">
              <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Size</span>
                <span className="text-xs font-black text-gray-700">{token.size}</span>
              </div>
              <div className="px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[9px] font-bold text-gray-400 block uppercase mb-0.5">Leading</span>
                <span className="text-xs font-black text-gray-700">{token.lineHeight}</span>
              </div>
            </div>
          </div>

          <div className="flex-grow relative z-10">
            <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-4 block">Visual Specimen</span>
            <div 
              className="text-gray-900 leading-tight transition-all duration-500 group-hover:text-black group-hover:tracking-tight" 
              style={{ fontSize: token.size, lineHeight: token.lineHeight, fontWeight: 500 }}
            >
              The quick brown fox jumps over the lazy dog.
            </div>
          </div>

          <button 
            onClick={() => handleCopy(token.var)} 
            className="p-4 bg-gray-50 hover:bg-indigo-600 text-gray-400 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 flex-shrink-0"
          >
            {copiedVar === token.var ? <CheckCircle2 size={20} /> : <Copy size={20} />}
          </button>
        </div>
      ))}
    </div>
  );

  const renderSpacing = () => (
    <div className="bg-white rounded-[32px] border border-gray-100 p-10 shadow-[0_30px_70px_rgba(0,0,0,0.03)] animate-in zoom-in-95 duration-1000">
      <div className="grid grid-cols-1 gap-12">
        {currentDesignVariables.spacing.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
          <div key={token.name} className="group flex flex-col md:flex-row md:items-center gap-8 relative">
            <div className="w-40 flex-shrink-0">
              <div className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Spacing Token</div>
              <div className="font-mono text-sm text-gray-900 font-bold mb-1">{token.name}</div>
              <div className="text-[11px] text-gray-400 font-medium">{token.value} • {token.rem}</div>
            </div>
            
            <div className="flex-grow flex items-center gap-6 relative">
              <div className="h-10 bg-indigo-50 border-l-2 border-r-2 border-indigo-200 rounded-sm relative transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]" style={{ width: token.value }}>
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-100/50 to-indigo-200/50"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-bold text-indigo-600 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                  {token.value}
                </div>
              </div>
              <div className="flex-grow h-0.5 bg-gray-100 rounded-full overflow-hidden">
                 <div className="h-full bg-gray-200 w-24 animate-in slide-in-from-left duration-1000 delay-300"></div>
              </div>
            </div>

            <button 
              onClick={() => handleCopy(token.var)} 
              className="p-3 bg-gray-50 hover:bg-white text-gray-400 hover:text-indigo-600 rounded-xl transition-all border border-transparent hover:border-gray-100 hover:shadow-md active:scale-95"
            >
              {copiedVar === token.var ? <CheckCircle2 size={18} className="text-green-500" /> : <Copy size={18} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRadius = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-8 animate-in fade-in duration-800">
      {currentDesignVariables.radius.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
        <div key={token.name} className="group bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm flex flex-col items-center hover:shadow-[0_25px_50px_rgba(0,0,0,0.06)] hover:-translate-y-2 transition-all duration-500 relative">
          <div className="w-24 h-24 mb-6 relative">
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gray-50 rounded-b-[18px]"></div>
            <div 
              className="w-full h-full relative z-10 shadow-[0_12px_24px_rgba(0,0,0,0.1)] border-t-4 border-l-4 border-indigo-50 transition-all duration-500 group-hover:shadow-[0_15px_35px_rgba(99,102,241,0.3)]" 
              style={{ borderRadius: token.value, backgroundColor: cPrimary, borderColor: 'rgba(255,255,255,0.2)' }} 
            />
          </div>
          <div className="text-center">
            <div className="font-mono text-sm text-gray-900 font-bold mb-1">{token.name}</div>
            <div className="text-[11px] font-black text-indigo-500/60 uppercase tracking-widest mb-4 inline-block px-3 py-1 bg-indigo-50 rounded-full">{token.value}</div>
          </div>
          <button 
            onClick={() => handleCopy(token.var)} 
            className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-gray-400 hover:text-white bg-gray-50 hover:bg-indigo-600 py-3 rounded-2xl transition-all border border-gray-100 hover:border-indigo-600 uppercase tracking-widest"
          >
            {copiedVar === token.var ? <CheckCircle2 size={12} className="text-white" /> : <Copy size={12} />}
            {copiedVar === token.var ? 'Disalin' : 'Copy Var'}
          </button>
        </div>
      ))}
    </div>
  );

  const renderFigmaComponents = () => (
    <div className="space-y-10 animate-in fade-in duration-300">
      
      {/* SECTION: TOMBOL (MATRIX STATE) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex justify-between items-end mb-6 border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-800">Tombol (Figma States)</h3>
          <span className="text-xs text-gray-500 flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
            <Figma size={12} className="text-pink-500"/> Arahkan kursor &amp; klik &apos;Copy to Figma&apos;
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left border-collapse">
            <thead>
              <tr>
                <th className="pb-4 font-medium text-gray-500 text-sm border-b border-gray-100">Varian</th>
                <th className="pb-4 font-medium text-gray-500 text-sm border-b border-gray-100">Default</th>
                <th className="pb-4 font-medium text-gray-500 text-sm border-b border-gray-100">Hover</th>
                <th className="pb-4 font-medium text-gray-500 text-sm border-b border-gray-100">Active</th>
                <th className="pb-4 font-medium text-gray-500 text-sm border-b border-gray-100">Disabled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {/* Primary */}
              <tr>
                <td className="py-6 font-medium text-gray-800 text-sm align-middle">Primer</td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-pri-def" name="Primary Button" type="Default State" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="${cPrimary}"/><text x="45" y="24" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimary }} className="text-white font-medium py-2 px-4 rounded-md w-[90px] transition-colors hover:opacity-90">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-pri-hov" name="Primary Button" type="Hover State" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="${cPrimaryHover}"/><text x="45" y="24" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimaryHover }} className="text-white font-medium py-2 px-4 rounded-md w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-pri-act" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="86" height="34" rx="4" fill="${cPrimaryActive}" stroke="${cPrimaryLightBorder}" stroke-width="2"/><text x="45" y="24" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimaryActive, borderColor: cPrimaryLightBorder }} className="border-2 text-white font-medium py-2 px-4 rounded-md w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-pri-dis" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="#f3f4f6"/><text x="45" y="24" fill="#9ca3af" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button disabled className="bg-gray-100 text-gray-400 font-medium py-2 px-4 rounded-md cursor-not-allowed w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
              </tr>
              {/* Secondary */}
              <tr>
                <td className="py-6 font-medium text-gray-800 text-sm align-middle">Sekunder</td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-sec-def" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="${cPrimaryLight}"/><text x="45" y="24" fill="${cPrimaryHover}" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimaryLight, color: cPrimaryHover }} className="font-medium py-2 px-4 rounded-md w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-sec-hov" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="${cPrimaryLightBorder}"/><text x="45" y="24" fill="${cPrimaryHover}" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimaryLightBorder, color: cPrimaryHover }} className="font-medium py-2 px-4 rounded-md w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-sec-act" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="86" height="34" rx="4" fill="${cPrimaryLight}" stroke="${cPrimary}" stroke-width="2"/><text x="45" y="24" fill="${cPrimaryActive}" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimaryLightBorder, borderColor: cPrimary, color: cPrimaryActive }} className="border-2 font-medium py-2 px-4 rounded-md w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-sec-dis" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="#f9fafb"/><text x="45" y="24" fill="#d1d5db" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button disabled className="bg-gray-50 text-gray-300 font-medium py-2 px-4 rounded-md cursor-not-allowed w-[90px]">Button</button>
                  </ComponentPreview>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION: INPUT TEKS */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">Kolom Teks (Figma States)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ComponentPreview title="Default" id="tf-def-st" isBlock figmaSvg={`<svg width="200" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="38" rx="6" fill="white" stroke="#d1d5db"/><text x="12" y="24" fill="#9ca3af" font-family="Inter, sans-serif" font-size="14">Placeholder</text></svg>`}>
            <input type="text" placeholder="Placeholder" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none placeholder-gray-400" readOnly />
          </ComponentPreview>
          <ComponentPreview title="Hover" id="tf-hov-st" isBlock figmaSvg={`<svg width="200" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="38" rx="6" fill="white" stroke="#9ca3af"/><text x="12" y="24" fill="#9ca3af" font-family="Inter, sans-serif" font-size="14">Placeholder</text></svg>`}>
            <input type="text" placeholder="Placeholder" className="w-full border border-gray-400 rounded-md px-3 py-2 text-sm focus:outline-none placeholder-gray-400" readOnly />
          </ComponentPreview>
          <ComponentPreview title="Active / Focus" id="tf-foc-st" isBlock figmaSvg={`<svg width="200" height="38" xmlns="http://www.w3.org/2000/svg"><rect x="1" y="1" width="198" height="36" rx="5" fill="white" stroke="${cPrimary}" stroke-width="2"/><text x="12" y="24" fill="#1f2937" font-family="Inter, sans-serif" font-size="14">Mengetik...</text><line x1="88" y1="10" x2="88" y2="28" stroke="${cPrimary}" stroke-width="1.5"/></svg>`}>
            <input type="text" value="Mengetik..." style={{ borderColor: cPrimary }} className="w-full ring-1 rounded-md px-3 py-2 text-sm focus:outline-none text-gray-800" readOnly />
          </ComponentPreview>
          <ComponentPreview title="Error" id="tf-err-st" isBlock figmaSvg={`<svg width="200" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="38" rx="6" fill="#fef2f2" stroke="#ef4444"/><text x="12" y="24" fill="#ef4444" font-family="Inter, sans-serif" font-size="14">Input salah</text></svg>`}>
            <input type="text" value="Input salah" className="w-full border border-red-500 bg-red-50 text-red-600 rounded-md px-3 py-2 text-sm focus:outline-none" readOnly />
          </ComponentPreview>
        </div>
      </div>

      {/* SECTION: COMMON COMPONENTS (AVATAR, CHIP, TOAST, ALERT) */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 border-b pb-2">Komponen Umum Tambahan</h3>
        
        <div className="space-y-8">
          {/* AVATAR & CHIPS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Avatars</h4>
              <div className="flex gap-4 items-end">
                <ComponentPreview id="avt-sm" figmaSvg={`<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="16" fill="${cPrimaryLightBorder}"/><text x="16" y="21" fill="${cPrimaryActive}" font-family="Inter, sans-serif" font-size="12" font-weight="600" text-anchor="middle">JD</text></svg>`}>
                  <div style={{ backgroundColor: cPrimaryLightBorder, color: cPrimaryActive }} className="w-8 h-8 rounded-full flex items-center justify-center font-semibold text-xs border border-transparent">JD</div>
                </ComponentPreview>
                <ComponentPreview id="avt-md" figmaSvg={`<svg width="48" height="48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="24" fill="${cPrimaryLightBorder}"/><text x="24" y="30" fill="${cPrimaryActive}" font-family="Inter, sans-serif" font-size="16" font-weight="600" text-anchor="middle">UI</text></svg>`}>
                  <div style={{ backgroundColor: cPrimaryLightBorder, color: cPrimaryActive }} className="w-12 h-12 rounded-full flex items-center justify-center font-semibold text-base border border-transparent">UI</div>
                </ComponentPreview>
                <ComponentPreview id="avt-lg" figmaSvg={`<svg width="64" height="64" xmlns="http://www.w3.org/2000/svg"><circle cx="32" cy="32" r="32" fill="${cPrimaryLightBorder}"/><text x="32" y="40" fill="${cPrimaryActive}" font-family="Inter, sans-serif" font-size="20" font-weight="600" text-anchor="middle">UX</text></svg>`}>
                  <div style={{ backgroundColor: cPrimaryLightBorder, color: cPrimaryActive }} className="w-16 h-16 rounded-full flex items-center justify-center font-semibold text-lg border border-transparent">UX</div>
                </ComponentPreview>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Status Chips (Badges)</h4>
              <div className="flex flex-wrap gap-3 items-center">
                <ComponentPreview id="ch-suc" figmaSvg={`<svg width="86" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="85" height="25" rx="12.5" fill="#dcfce7" stroke="#bbf7d0"/><circle cx="12" cy="13" r="3" fill="#16a34a"/><text x="22" y="17" fill="#166534" font-family="Inter, sans-serif" font-size="12" font-weight="600">Success</text></svg>`}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span> Success
                  </span>
                </ComponentPreview>
                <ComponentPreview id="ch-war" figmaSvg={`<svg width="86" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="85" height="25" rx="12.5" fill="#ffedd5" stroke="#fed7aa"/><circle cx="12" cy="13" r="3" fill="#ea580c"/><text x="22" y="17" fill="#9a3412" font-family="Inter, sans-serif" font-size="12" font-weight="600">Warning</text></svg>`}>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 border border-orange-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span> Warning
                  </span>
                </ComponentPreview>
                <ComponentPreview id="ch-inf" figmaSvg={`<svg width="65" height="26" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="64" height="25" rx="12.5" fill="${cPrimaryLight}" stroke="${cPrimaryLightBorder}"/><circle cx="12" cy="13" r="3" fill="${cPrimary}"/><text x="22" y="17" fill="${cPrimaryHover}" font-family="Inter, sans-serif" font-size="12" font-weight="600">Info</text></svg>`}>
                  <span style={{ backgroundColor: cPrimaryLight, color: cPrimaryHover, borderColor: cPrimaryLightBorder }} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border">
                    <span style={{ backgroundColor: cPrimary }} className="w-1.5 h-1.5 rounded-full"></span> Info
                  </span>
                </ComponentPreview>
              </div>
            </div>
          </div>

          <hr className="border-gray-100"/>

          {/* ALERTS & TOASTS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Alert Banners</h4>
              <ComponentPreview id="alt-inf" isBlock figmaSvg={`<svg width="340" height="64" xmlns="http://www.w3.org/2000/svg"><rect width="340" height="64" rx="8" fill="${cPrimaryLight}" stroke="${cPrimaryLightBorder}"/><text x="48" y="28" fill="${cPrimaryActive}" font-family="Inter, sans-serif" font-size="14" font-weight="600">Pembaruan Tersedia</text><text x="48" y="48" fill="${cPrimaryHover}" font-family="Inter, sans-serif" font-size="13">Silakan muat ulang halaman ini.</text></svg>`}>
                <div style={{ backgroundColor: cPrimaryLight, borderColor: cPrimaryLightBorder }} className="border p-4 rounded-lg flex items-start gap-3 w-full max-w-sm cursor-pointer">
                  <Info size={20} color={cPrimary} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 style={{ color: cPrimaryActive }} className="text-sm font-semibold">Pembaruan Tersedia</h4>
                    <p style={{ color: cPrimaryHover }} className="text-sm mt-0.5">Silakan muat ulang halaman ini.</p>
                  </div>
                </div>
              </ComponentPreview>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-4">Toast Notification / Snackbar</h4>
              <ComponentPreview id="tst-suc" isBlock figmaSvg={`<svg width="320" height="48" xmlns="http://www.w3.org/2000/svg"><rect width="320" height="48" rx="8" fill="#1f2937"/><text x="44" y="29" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500">Tindakan berhasil disimpan</text></svg>`}>
                <div className="bg-gray-900 text-white flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg w-full max-w-sm cursor-pointer">
                  <CheckCircle2 size={18} className="text-green-400 flex-shrink-0" />
                  <span className="text-sm font-medium">Tindakan berhasil disimpan</span>
                </div>
              </ComponentPreview>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: MODAL / ALERTS DENGAN UX COPYWRITER AI */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Sparkles size={120} color={cPrimary} /></div>
        
        <div className="flex justify-between items-end mb-6 border-b pb-2">
          <h3 className="text-lg font-semibold text-gray-800">Pesan Modal & Peringatan</h3>
          <div style={{ backgroundColor: cPrimaryLight, borderColor: cPrimaryLightBorder }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border">
            <Sparkles size={14} color={cPrimaryHover} />
            <span style={{ color: cPrimaryHover }} className="text-xs font-medium">AI UX Copywriter</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsikan Skenario Modal:</label>
              <textarea 
                value={modalPrompt} onChange={(e) => setModalPrompt(e.target.value)}
                placeholder="Contoh: Pengguna ingin membatalkan langganan premium..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] resize-none"
              />
              <button 
                onClick={generateModalCopy} disabled={isGeneratingModal || !modalPrompt.trim()}
                style={{ backgroundColor: cPrimary }}
                className="mt-3 w-full flex items-center justify-center gap-2 text-white font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-70 hover:opacity-90"
              >
                {isGeneratingModal ? (
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (<><Wand2 size={16} /> Buat Copy (Teks) Modal</>)}
              </button>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              Ketik skenario UX dan Gemini API akan mengembalikan struktur JSON (Judul, Teks, Tombol, Intent) untuk langsung diterapkan ke pratinjau komponen di sebelah kanan yang <b>Bisa Disalin ke Figma</b>.
            </p>
          </div>

          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-gray-100/50 p-6 rounded-xl border border-gray-200 border-dashed">
            <ComponentPreview 
              id="modal-dyn-ai"
              isBlock
              figmaSvg={`<svg width="400" height="230" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="400" height="230" rx="12" fill="white" stroke="#e5e7eb"/>
                <rect x="0" y="166" width="400" height="64" fill="#f9fafb" stroke="#e5e7eb"/>
                <text x="24" y="90" fill="#111827" font-family="Inter, sans-serif" font-size="18" font-weight="600">${modalData.title}</text>
                <text x="24" y="115" fill="#6b7280" font-family="Inter, sans-serif" font-size="14">${modalData.body.length > 45 ? modalData.body.substring(0, 45) + '...' : modalData.body}</text>
                <rect x="180" y="180" width="80" height="36" rx="6" fill="white" stroke="#d1d5db"/>
                <text x="220" y="203" fill="#374151" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">${modalData.secondaryButtonText}</text>
                <rect x="270" y="180" width="110" height="36" rx="6" fill="${modalData.intent === 'danger' ? '#dc2626' : modalData.intent === 'success' ? '#16a34a' : modalData.intent === 'warning' ? '#ea580c' : cPrimary}"/>
                <text x="325" y="203" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">${modalData.primaryButtonText}</text>
              </svg>`}
            >
              <div className="bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 overflow-hidden flex flex-col relative w-full max-w-sm transition-all duration-500 mx-auto">
                 <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100">
                   <X size={18} />
                 </button>
                 <div className="p-6">
                   <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${
                      modalData.intent === 'danger' ? 'bg-red-100' : 
                      modalData.intent === 'success' ? 'bg-green-100' :
                      modalData.intent === 'warning' ? 'bg-orange-100' : ''
                   }`} style={modalData.intent === 'info' || modalData.intent === 'primary' ? { backgroundColor: cPrimaryLight } : {}}>
                     {modalData.intent === 'danger' && <AlertCircle className="text-red-600" size={24} />}
                     {modalData.intent === 'success' && <CheckCircle2 className="text-green-600" size={24} />}
                     {modalData.intent === 'warning' && <AlertCircle className="text-orange-600" size={24} />}
                     {(modalData.intent === 'info' || modalData.intent === 'primary') && <Info color={cPrimaryHover} size={24} />}
                   </div>
                   <h3 className="text-lg font-semibold text-gray-900 mb-2">{modalData.title}</h3>
                   <p className="text-sm text-gray-500 leading-relaxed">
                     {modalData.body}
                   </p>
                 </div>
                 <div className="bg-gray-50 px-6 py-4 flex justify-end gap-3 mt-auto border-t border-gray-100">
                   <button className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-gray-200 outline-none transition-colors shadow-sm">
                     {modalData.secondaryButtonText}
                   </button>
                   <button 
                     style={modalData.intent === 'info' || modalData.intent === 'primary' ? { backgroundColor: cPrimary } : {}}
                     className={`px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white shadow-sm transition-colors outline-none focus:ring-2 focus:ring-offset-2 ${
                      modalData.intent === 'danger' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 
                      modalData.intent === 'success' ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500' :
                      modalData.intent === 'warning' ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500' : 
                      'hover:opacity-90'
                   }`}>
                     {modalData.primaryButtonText}
                   </button>
                 </div>
              </div>
            </ComponentPreview>
          </div>

        </div>
      </div>
    </div>
  );

  const renderCodeComponents = () => {
    const frameworksList = [
      { id: 'react', label: 'React' },
      { id: 'angular', label: 'Angular' },
      { id: 'bootstrap', label: 'Bootstrap' },
      { id: 'flutter', label: 'Flutter' },
      { id: 'android', label: 'Android' },
      { id: 'ios', label: 'iOS' },
    ];

    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg w-fit mb-6">
          {frameworksList.map(fw => (
            <button
              key={fw.id} onClick={() => setFramework(fw.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${framework === fw.id ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
            >
              {fw.label}
            </button>
          ))}
        </div>

        <CodePreviewCard
          id="fw-btn" title="Primary Button" currentFramework={framework}
          preview={
            <button style={{ backgroundColor: cPrimary }} className="text-white font-medium py-2.5 px-5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              Simpan Perubahan
            </button>
          }
          codes={{
            react: `<button style={{ backgroundColor: '${cPrimary}' }} className="text-white font-medium py-2.5 px-5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">\n  Simpan Perubahan\n</button>`,
            angular: `<button [style.backgroundColor]="'${cPrimary}'" class="text-white font-medium py-2.5 px-5 rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"\n  [disabled]="isSaving"\n  (click)="onSave()">\n  Simpan Perubahan\n</button>`,
            bootstrap: `<button type="button" class="btn text-white px-4 py-2 fw-medium rounded-3" style="background-color: ${cPrimary};" disabled>\n  Simpan Perubahan\n</button>`,
            flutter: `ElevatedButton(\n  onPressed: isSaving ? null : () => save(),\n  style: ElevatedButton.styleFrom(\n    backgroundColor: const Color(0xFF${cPrimary.replace('#','')}),\n    foregroundColor: Colors.white,\n    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),\n    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),\n  ),\n  child: const Text('Simpan Perubahan', style: TextStyle(fontWeight: FontWeight.w500)),\n)`,
            android: `Button(\n    onClick = { onSave() },\n    enabled = !isSaving,\n    colors = ButtonDefaults.buttonColors(\n        containerColor = Color(0xFF${cPrimary.replace('#','')}),\n        contentColor = Color.White\n    ),\n    shape = RoundedCornerShape(8.dp),\n    modifier = Modifier.padding(horizontal = 20.dp, vertical = 10.dp)\n) {\n    Text("Simpan Perubahan", fontWeight = FontWeight.Medium)\n}`,
            ios: `Button(action: { onSave() }) {\n    Text("Simpan Perubahan")\n        .font(.system(size: 16, weight: .medium))\n        .foregroundColor(.white)\n        .padding(.horizontal, 20)\n        .padding(.vertical, 10)\n        .background(Color(hex: "${cPrimary.replace('#','')}"))\n        .cornerRadius(8)\n}\n.disabled(isSaving)`
          }}
        />

        <CodePreviewCard
          id="fw-input" title="Text Field (Form Group)" currentFramework={framework}
          preview={
            <div className="flex flex-col gap-1.5 w-full max-w-sm">
              <label className="text-sm font-medium text-gray-700">Alamat Email</label>
              <input type="email" placeholder="nama@email.com" className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:border-blue-500 transition-shadow" style={{ '--tw-ring-color': cPrimary }} />
              <span className="text-xs text-gray-500">Kami tidak akan membagikan email Anda.</span>
            </div>
          }
          codes={{
            react: `<div className="flex flex-col gap-1.5 w-full max-w-sm">\n  <label className="text-sm font-medium text-gray-700">Alamat Email</label>\n  <input \n    type="email" \n    placeholder="nama@email.com"\n    style={{ '--tw-ring-color': '${cPrimary}' }}\n    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 transition-shadow"\n  />\n</div>`,
            angular: `<div class="flex flex-col gap-1.5 w-full max-w-sm">\n  <label class="text-sm font-medium text-gray-700">Alamat Email</label>\n  <input type="email" [(ngModel)]="userEmail" placeholder="nama@email.com" class="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent" [style.--tw-ring-color]="'${cPrimary}'" />\n</div>`,
            bootstrap: `<div class="mb-3" style="max-width: 24rem;">\n  <label class="form-label fw-medium text-secondary">Alamat Email</label>\n  <input type="email" class="form-control rounded-3 border-secondary-subtle focus-ring" style="--bs-focus-ring-color: ${cPrimary}40" placeholder="nama@email.com">\n</div>`,
            flutter: `TextField(\n  decoration: InputDecoration(\n    hintText: 'nama@email.com',\n    focusedBorder: OutlineInputBorder(\n      borderRadius: BorderRadius.circular(8),\n      borderSide: const BorderSide(color: Color(0xFF${cPrimary.replace('#','')}), width: 2),\n    ),\n  ),\n)`,
            android: `OutlinedTextField(\n    value = emailText,\n    onValueChange = { emailText = it },\n    colors = TextFieldDefaults.outlinedTextFieldColors(\n        focusedBorderColor = Color(0xFF${cPrimary.replace('#','')})\n    )\n)`,
            ios: `TextField("nama@email.com", text: $emailText)\n    .overlay(\n        RoundedRectangle(cornerRadius: 8)\n            .stroke(Color(hex: "${cPrimary.replace('#','')}"), lineWidth: isEditing ? 2 : 1)\n    )`
          }}
        />
      </div>
    );
  };

  const renderComponents = () => (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-200 mb-6">
        <button onClick={() => setCompSubTab('figma')} className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${compSubTab === 'figma' ? 'border-pink-500 text-pink-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Figma size={16} /> Figma Components</button>
        <button onClick={() => setCompSubTab('code')} className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${compSubTab === 'code' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Code2 size={16} /> Framework Components (Code)</button>
      </div>
      {compSubTab === 'figma' && renderFigmaComponents()}
      {compSubTab === 'code' && renderCodeComponents()}
    </div>
  );

  const renderAIComponentGenerator = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Sparkles size={20} /></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">AI Component Generator</h3>
            <p className="text-sm text-gray-600">Deskripsikan komponen yang ingin Anda buat, dan AI akan merancangnya sesuai Design System Anda.</p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 flex gap-3">
            <input 
              type="text" 
              value={aiCompPrompt} 
              onChange={(e) => setAiCompPrompt(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateComponentWithAI()}
              placeholder="Contoh: Buatkan sidebar dengan 3 menu dan profil di bawah..." 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
              disabled={isGeneratingComp}
            />
            <button 
              onClick={generateComponentWithAI}
              disabled={isGeneratingComp || !aiCompPrompt.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
            >
              {isGeneratingComp ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <><Send size={18} /> Generate</>
              )}
            </button>
          </div>
          
          <div className="w-full md:w-64">
            <div className="relative">
              <select 
                value={activeModel} 
                onChange={(e) => setActiveModel(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
              >
                {GEMINI_MODELS.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Sparkles size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {generatedComp && (
        <div className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
          <div className="w-full bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Figma size={16} className="text-pink-500" /> Figma Preview
              </h4>
              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    const fullSvg = stitchSvgWithDRD(generatedComp.svg, generatedComp.drd, generatedComp.title);
                    handleCopy(fullSvg, 'ai-comp-gen-figma');
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold transition-all shadow-sm"
                >
                  {copiedVar === 'ai-comp-gen-figma' ? <CheckCircle2 size={16} className="text-green-500" /> : <Figma size={16} className="text-pink-500" />}
                  Copy to Figma
                </button>
                <button 
                  onClick={() => setShowAiCodeModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100 rounded-lg text-sm font-semibold transition-all"
                >
                  <Code2 size={16} /> Lihat Kode React
                </button>
              </div>
            </div>
            
            <div className="p-16 flex flex-col items-center bg-[#f3f4f6]/80 relative overflow-hidden min-h-[500px] justify-center">
              <div className="w-full overflow-x-auto pt-10 pb-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                <ComponentPreview 
                  id="ai-generated-svg" 
                  figmaSvg={stitchSvgWithDRD(generatedComp.svg, generatedComp.drd, generatedComp.title)}
                >
                  <div className="flex flex-col items-center min-w-max px-8">
                    <div 
                      className="shadow-2xl rounded-2xl overflow-hidden bg-white border border-gray-100"
                      dangerouslySetInnerHTML={{ __html: generatedComp.svg }} 
                    />
                  </div>
                </ComponentPreview>
              </div>
            </div>

            {generatedComp.drd && (
              <div className="px-12 py-16 bg-white border-t border-gray-100">
                <div className="w-full bg-[#f8fafc] border border-gray-100/50 rounded-[32px] p-12 shadow-sm">
                  <h5 className="text-xl font-bold text-blue-500 mb-10 border-b border-gray-100/50 pb-6 tracking-tight">
                    DESIGN REQUIREMENT DOCUMENT
                  </h5>
                  
                  <div className="space-y-16">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">OBJECTIVE & DESIGN RATIONALE</span>
                      <p className="text-2xl text-gray-900 font-bold leading-tight mb-4">{generatedComp.drd.objective}</p>
                      {generatedComp.drd.rationale && (
                        <p className="text-base text-gray-500 italic leading-relaxed max-w-4xl">
                          {generatedComp.drd.rationale}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-10">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">ACCESSIBILITY (WCAG)</span>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{generatedComp.drd.accessibility}</p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">INTERACTION BEHAVIOR</span>
                        <p className="text-sm text-gray-600 leading-relaxed font-medium">{generatedComp.drd.behavior}</p>
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-4">DESIGN SYSTEM TOKENS</span>
                      <p className="text-sm text-blue-500 font-bold tracking-wide">
                        {(generatedComp.drd.tokens_used || []).join(', ')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 italic">
                Arahkan kursor ke komponen untuk tombol &quot;Copy to Figma&quot;
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW KODE AI */}
      {showAiCodeModal && generatedComp && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Code2 size={20} /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Source Code: {generatedComp.title}</h3>
                  <p className="text-xs text-gray-500">React + Tailwind CSS Component</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAiCodeModal(false)} 
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-0 flex-1 overflow-hidden relative bg-gray-900">
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => handleCopy(generatedComp.code, 'ai-generated-code')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-lg"
                >
                  {copiedVar === 'ai-generated-code' ? <CheckCircle2 size={14} className="text-green-300" /> : <Copy size={14} />}
                  {copiedVar === 'ai-generated-code' ? 'Tersalin!' : 'Salin Kode'}
                </button>
              </div>
              <pre className="p-8 pt-12 h-full overflow-y-auto text-gray-100 text-sm font-mono leading-relaxed">
                <code>{generatedComp.code}</code>
              </pre>
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button 
                onClick={() => setShowAiCodeModal(false)}
                className="px-6 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderIconGenerator = () => (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><Shapes size={20} /></div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">AI Icon Generator</h3>
            <p className="text-sm text-gray-600">Buat icon custom secara instan dengan berbagai variasi state design system.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <input 
            type="text" 
            value={iconPrompt} 
            onChange={(e) => setIconPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && generateIconsWithAI()}
            placeholder="Contoh: Icon koper traveling, user profile, rocket ship..." 
            className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-all"
          />
          <button 
            onClick={generateIconsWithAI}
            disabled={isGeneratingIcons || !iconPrompt.trim()}
            className="bg-pink-600 hover:bg-pink-700 text-white px-6 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 disabled:opacity-70 shadow-sm"
          >
            {isGeneratingIcons ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <><Sparkles size={18} /> Generate Icon</>
            )}
          </button>
        </div>
      </div>

      {generatedIcons && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
          {/* HEADER CARD DENGAN COPY ALL */}
          <div className="px-8 py-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <div>
              <h4 className="font-bold text-gray-800">{generatedIcons.title} - Variations</h4>
              <p className="text-xs text-gray-500">Kumpulan variasi icon untuk berbagai kebutuhan state.</p>
            </div>
            <button 
              onClick={() => {
                const fullSvg = `
<svg width="600" height="400" viewBox="0 0 600 400" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="600" height="400" fill="white" />
  <g transform="translate(50, 50)">
    <title>Stroke Variants</title>
    <g transform="translate(0, 0)">
       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="${activeBrand.primaryHex}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${generatedIcons.svg}</svg>
       <text x="24" y="70" font-family="Arial" font-size="10" fill="${activeBrand.primaryHex}" text-anchor="middle" font-weight="bold">PRIMARY</text>
    </g>
    <g transform="translate(150, 0)">
       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${generatedIcons.svg}</svg>
       <text x="24" y="70" font-family="Arial" font-size="10" fill="#ef4444" text-anchor="middle" font-weight="bold">DANGER</text>
    </g>
    <g transform="translate(300, 0)">
       <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#e5e7eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${generatedIcons.svg}</svg>
       <text x="24" y="70" font-family="Arial" font-size="10" fill="#9ca3af" text-anchor="middle" font-weight="bold">DISABLED</text>
    </g>
  </g>
  <g transform="translate(50, 220)">
    <title>Block Variants</title>
    <g transform="translate(0, 0)">
       <rect width="48" height="48" rx="8" fill="${activeBrand.primaryHex}" />
       <svg width="24" height="24" x="12" y="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${generatedIcons.svg}</svg>
       <text x="24" y="70" font-family="Arial" font-size="10" fill="${activeBrand.primaryHex}" text-anchor="middle" font-weight="bold">PRIMARY</text>
    </g>
    <g transform="translate(150, 0)">
       <rect width="48" height="48" rx="8" fill="#ef4444" />
       <svg width="24" height="24" x="12" y="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${generatedIcons.svg}</svg>
       <text x="24" y="70" font-family="Arial" font-size="10" fill="#ef4444" text-anchor="middle" font-weight="bold">DANGER</text>
    </g>
    <g transform="translate(300, 0)">
       <rect width="48" height="48" rx="8" fill="#f3f4f6" />
       <svg width="24" height="24" x="12" y="12" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${generatedIcons.svg}</svg>
       <text x="24" y="70" font-family="Arial" font-size="10" fill="#9ca3af" text-anchor="middle" font-weight="bold">DISABLED</text>
    </g>
  </g>
</svg>`.trim();
                handleCopy(fullSvg, 'icon-all-variants');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-semibold hover:bg-black transition-all shadow-md group active:scale-95"
            >
              <Figma size={14} className="text-pink-400 group-hover:rotate-12 transition-transform" />
              {copiedVar === 'icon-all-variants' ? 'Tersalin!' : 'Copy to Figma'}
            </button>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="p-8 space-y-12 flex-1 border-r border-gray-100/50">
              {/* SECTION STROKE */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1 h-3 bg-pink-500 rounded-full"></span>
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Icon Style: Stroke Outline</h5>
                </div>
                <div className="grid grid-cols-3 gap-8 max-w-2xl px-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl border border-blue-50 text-blue-600 bg-blue-50/20 hover:bg-blue-50 transition-all cursor-pointer group relative">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: generatedIcons.svg }} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Primary</span>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl border border-red-50 text-red-600 bg-red-50/20 hover:bg-red-50 transition-all cursor-pointer group relative">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: generatedIcons.svg }} />
                    </div>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">Danger</span>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl border border-gray-100 text-gray-300 bg-gray-50/30 transition-all cursor-not-allowed">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: generatedIcons.svg }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Disabled</span>
                  </div>
                </div>
              </div>

              {/* SECTION BLOCK */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-1 h-3 bg-indigo-500 rounded-full"></span>
                  <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Icon Style: Solid Block</h5>
                </div>
                <div className="grid grid-cols-3 gap-8 max-w-2xl px-4">
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer" style={{ backgroundColor: activeBrand.primaryHex }}>
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: generatedIcons.svg }} />
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Primary</span>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl bg-red-600 text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: generatedIcons.svg }} />
                    </div>
                    <span className="text-[10px] font-bold text-red-600 uppercase tracking-tighter">Danger</span>
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <div className="p-6 rounded-2xl bg-gray-100 text-gray-300 shadow-inner transition-all cursor-not-allowed">
                      <svg viewBox="0 0 24 24" className="w-10 h-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: generatedIcons.svg }} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Disabled</span>
                  </div>
                </div>
              </div>
            </div>

            {/* MINI DRD SIDEBAR */}
            {generatedIcons.drd && (
              <div className="w-full lg:w-80 bg-gray-50/50 p-8 border-l border-gray-100 flex flex-col gap-8">
                <div>
                  <h6 className="text-[9px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-3">OBJECTIVE</h6>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">{generatedIcons.drd.objective}</p>
                </div>
                <div>
                  <h6 className="text-[9px] font-bold text-emerald-500 uppercase tracking-[0.2em] mb-3">RATIONALE</h6>
                  <p className="text-xs text-gray-500 italic leading-relaxed">{generatedIcons.drd.rationale}</p>
                </div>
                <div>
                  <h6 className="text-[9px] font-bold text-orange-500 uppercase tracking-[0.2em] mb-3">ACCESSIBILITY</h6>
                  <p className="text-xs text-gray-600 font-medium leading-relaxed">{generatedIcons.drd.accessibility}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="px-8 py-3 bg-gray-50 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 italic font-medium">Tip: Klik &quot;Copy to Figma&quot; untuk mengambil seluruh set icon sekaligus dalam layout grid.</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderLinter = () => (
    <div className="h-full flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[600px]">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center gap-3">
        <div className="bg-indigo-600 text-white p-2 rounded-lg"><Code2 size={20} /></div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">AI Token Linter</h3>
          <p className="text-sm text-gray-600">Tempelkan kode mentah (HTML/CSS), dan biarkan AI menyarankan Variabel Design System <b>{activeBrand.name}</b> Anda.</p>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 md:grid-cols-2">
        <div className="border-b md:border-b-0 md:border-r border-gray-200 flex flex-col bg-gray-50">
          <div className="px-4 py-3 bg-gray-100 border-b border-gray-200 flex justify-between items-center"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Kode Anda (HTML/CSS)</span></div>
          <textarea value={linterInput} onChange={(e) => setLinterInput(e.target.value)} className="flex-1 w-full bg-transparent p-4 font-mono text-sm text-gray-800 focus:outline-none resize-none" spellCheck="false" />
          <div className="p-4 bg-white border-t border-gray-200">
            <button onClick={runTokenLinter} disabled={isLinting || !linterInput.trim()} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70">
              {isLinting ? (<>Menganalisis Kode...</>) : (<><Sparkles size={18} /> Jalankan Linter</>)}
            </button>
          </div>
        </div>

        <div className="flex flex-col bg-white overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200"><span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Rekomendasi Linter AI</span></div>
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {!linterOutput && !isLinting && (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center space-y-3"><Check size={48} className="text-gray-200" /><p className="text-sm">Belum ada hasil linter.<br/>Klik &quot;Jalankan Linter&quot; untuk memulai analisis kode.</p></div>
            )}
            {isLinting && (
              <div className="flex flex-col gap-4"><div className="w-3/4 h-4 bg-gray-100 rounded animate-pulse"></div><div className="w-full h-4 bg-gray-100 rounded animate-pulse"></div><div className="w-5/6 h-4 bg-gray-100 rounded animate-pulse"></div><div className="w-full h-32 bg-gray-50 rounded-xl mt-4 animate-pulse"></div></div>
            )}
            {linterOutput && !isLinting && (<div className="text-gray-800 text-sm leading-relaxed">{formatMessage(linterOutput)}</div>)}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTokens = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {['Global Tokens', 'Alias Tokens', 'Component Tokens'].map((title) => (
          <div key={title} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-bold text-gray-800 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 mb-4">Kelola dan lihat daftar variabel {title.toLowerCase()} untuk sistem desain ini.</p>
            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-700">Lihat Detail →</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPatterns = () => (
    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100 border-dashed">
      <div className="p-4 bg-gray-50 rounded-2xl mb-4"><Shapes size={32} className="text-gray-300" /></div>
      <h3 className="text-lg font-bold text-gray-800">Layout Patterns</h3>
      <p className="text-sm text-gray-500 max-w-sm text-center">Modul pola tata letak akan segera hadir untuk membantu Anda membangun struktur halaman lebih cepat.</p>
    </div>
  );

  const renderResources = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-500">
      <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-3xl text-white">
        <h3 className="text-xl font-bold mb-2">Figma UI Kit</h3>
        <p className="text-indigo-100 text-sm mb-6 opacity-80">Dokumentasi lengkap komponen dan gaya dalam format file Figma (.fig).</p>
        <button className="px-6 py-3 bg-white text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-50 transition-colors">Download Kit</button>
      </div>
      <div className="p-8 bg-gray-900 rounded-3xl text-white">
        <h3 className="text-xl font-bold mb-2">Documentation v1.0</h3>
        <p className="text-gray-400 text-sm mb-6 opacity-80">Panduan lengkap penggunaan token, komponen, dan standar kualitas desain.</p>
        <button className="px-6 py-3 bg-gray-800 text-white rounded-xl font-bold text-xs hover:bg-gray-700 transition-colors">Baca Panduan</button>
      </div>
    </div>
  );

  const renderAIAssistant = () => {
    if (messages.length === 0) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] animate-in fade-in duration-700 relative">

          {/* Hero Content */}
          <div className="z-10 w-full max-w-3xl px-6 flex flex-col items-center">
            <h1 className="text-5xl md:text-6xl font-black text-[#1e293b] mb-14 text-center tracking-tight leading-tight">
              Architect your <br /> Design Language.
            </h1>

            <div className="w-full relative px-4">
              <form onSubmit={handleAISubmit} className="relative">
                <input 
                  type="text" 
                  value={inputValue} 
                  onChange={(e) => setInputValue(e.target.value)} 
                  placeholder="Ask anything..." 
                  className="w-full bg-white border border-gray-100 rounded-[28px] pl-8 pr-16 py-8 text-xl shadow-[0_20px_60px_rgba(0,0,0,0.04)] focus:outline-none focus:ring-4 focus:ring-indigo-100/40 transition-all placeholder:text-gray-300 font-medium"
                  disabled={isLoadingChat} 
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-4">
                  <button 
                    type="submit" 
                    disabled={isLoadingChat || !inputValue.trim()}
                    className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                  >
                    <Send size={24} />
                  </button>
                </div>
              </form>
            </div>

            <div className="mt-32 flex flex-col items-center gap-4 text-[11px] text-gray-400 font-bold tracking-widest uppercase opacity-70">
               <div className="flex gap-8">
                 <span className="hover:text-gray-700 cursor-pointer transition-colors">DSM SID Terms</span>
                 <span className="opacity-40">•</span>
                 <span className="hover:text-gray-700 cursor-pointer transition-colors">Privacy Policy</span>
               </div>
               <p className="opacity-100 font-bold normal-case tracking-normal mt-1">SID is AI and can make mistakes.</p>
            </div>
          </div>

          {/* Background Ambient Glows - Matching Reference Subtle Look */}
          <div className="absolute top-[20%] right-[-10%] w-[1000px] h-[1000px] bg-indigo-50/20 rounded-full blur-[160px] -z-[1] pointer-events-none"></div>
          <div className="absolute bottom-[20%] left-[-10%] w-[800px] h-[800px] bg-blue-50/10 rounded-full blur-[140px] -z-[1] pointer-events-none"></div>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden animate-in slide-in-from-bottom-2 duration-300">
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={20} />
            </button>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Bot size={18} /></div>
            <div>
              <h3 className="text-sm font-bold text-gray-800">Conversation History</h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">Active Project Context: {activeBrand.name}</p>
            </div>
          </div>
          <button 
            onClick={() => setMessages([])} 
            className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group"
            title="Clear Chat / Return Home"
          >
            <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/20">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-5 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${msg.role === 'user' ? '' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`} style={msg.role === 'user' ? {backgroundColor: cPrimaryLight, color: cPrimaryActive} : {}}>
                {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
              </div>
              <div className={`max-w-[85%] rounded-[24px] p-5 shadow-sm leading-relaxed ${msg.role === 'user' ? 'rounded-tr-none font-medium' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'}`} style={msg.role === 'user' ? {backgroundColor: cPrimaryLight, color: cPrimaryActive} : {}}>
                {formatMessage(msg.content)}
              </div>
            </div>
          ))}
          {isLoadingChat && (
            <div className="flex gap-5 animate-pulse">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm"><Bot size={18} /></div>
              <div className="bg-white border border-gray-100 text-gray-500 rounded-[24px] rounded-tl-none p-5 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="p-6 border-t border-gray-100 bg-white">
          <form onSubmit={handleAISubmit} className="flex gap-3 relative max-w-4xl mx-auto">
            <input 
              type="text" 
              value={inputValue} 
              onChange={(e) => setInputValue(e.target.value)} 
              placeholder="Type your follow-up message..." 
              className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl pl-12 pr-16 py-4 focus:outline-none focus:ring-4 focus:ring-indigo-100/50 focus:bg-white transition-all font-medium text-gray-700" 
              disabled={isLoadingChat} 
            />
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
               <Bot size={18} />
            </div>
            <button 
              type="submit" 
              disabled={isLoadingChat || !inputValue.trim()} 
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600 text-white rounded-xl disabled:opacity-50 transition-all hover:bg-indigo-700 hover:shadow-lg active:scale-95"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  const renderRightSidebar = () => {
    if (!selectedComponent) return null;

    return (
      <aside className={`fixed top-4 bottom-4 right-4 z-[100] bg-white border border-gray-100 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.08)] rounded-[24px] transition-all duration-500 w-[320px] overflow-hidden animate-in slide-in-from-right-8`}>
        <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
          <h2 className="font-bold text-gray-900 text-sm">Component Properties</h2>
          <button onClick={() => setSelectedComponent(null)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-xl shadow-sm transition-all"><X size={18} /></button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-grow space-y-8">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 block">Selected</label>
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/50">
              <p className="text-sm font-bold text-indigo-900 mb-1">{selectedComponent.name}</p>
              <p className="text-[11px] text-indigo-600/70 font-medium">{selectedComponent.type || 'Standard UI Component'}</p>
            </div>
          </div>

          <div>
            <div className="flex gap-4 border-b border-gray-100 mb-4">
               <button className="pb-3 text-xs font-bold border-b-2 border-indigo-600 text-indigo-600">CSS</button>
               <button className="pb-3 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors">React</button>
            </div>
            <div className="bg-[#0f172a] p-5 rounded-2xl text-blue-300 text-[11px] font-mono leading-relaxed overflow-hidden relative group">
              <button className="absolute top-4 right-4 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all shadow-xl"><Copy size={14} /></button>
              <pre className="whitespace-pre-wrap">
{`.dsm-sid-btn-${selectedComponent.id || 'primary'} {
  background: ${cPrimary};
  color: #fff;
  border-radius: ${borderRadius}px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.2s;
}`}
              </pre>
            </div>
          </div>

          <div>
             <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4 block">Design Tokens</label>
             <div className="space-y-3">
                <div className="p-3 border border-gray-100 rounded-xl hover:border-indigo-200 transition-all hover:shadow-md hover:shadow-indigo-500/5 group">
                   <p className="text-[10px] text-gray-400 font-mono mb-1 group-hover:text-indigo-400 transition-colors">color.brand.primary</p>
                   <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cPrimary }}></div>
                      <p className="text-xs font-bold text-gray-700">{cPrimary}</p>
                   </div>
                </div>
                <div className="p-3 border border-gray-100 rounded-xl hover:border-indigo-200 transition-all">
                   <p className="text-[10px] text-gray-400 font-mono mb-1">size.radius.default</p>
                   <p className="text-xs font-bold text-gray-700">{borderRadius}px</p>
                </div>
             </div>
          </div>
        </div>
      </aside>
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* SIDEBAR OVERLAY FOR MOBILE */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm z-[90] lg:hidden animate-in fade-in duration-300" 
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
      {showAddBrandModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Palette size={18} className="text-indigo-600" /> Tambah Brand Baru
              </h3>
              <button onClick={resetAddBrandModal} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            {/* TABS MANUAL VS AI MAGIC */}
            <div className="flex gap-4 border-b border-gray-200 px-6 pt-4 bg-gray-50/50">
              <button 
                onClick={() => setBrandCreationMode('manual')} 
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${brandCreationMode === 'manual' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                Manual
              </button>
              <button 
                onClick={() => setBrandCreationMode('ai')} 
                className={`pb-3 text-sm font-medium transition-colors flex items-center gap-1 border-b-2 ${brandCreationMode === 'ai' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
              >
                <Sparkles size={14} /> AI Magic
              </button>
            </div>

            {brandCreationMode === 'manual' ? (
              <form onSubmit={handleAddBrand} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Brand</label>
                  <input 
                    type="text" required value={newBrandName} onChange={e => setNewBrandName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Primary Color (HEX)</label>
                  <div className="flex gap-3 items-center">
                    <div className="w-12 h-12 rounded-lg border border-gray-300 shadow-inner flex-shrink-0 overflow-hidden relative cursor-pointer">
                      <input 
                        type="color" value={newBrandHex} onChange={e => setNewBrandHex(e.target.value)}
                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                      />
                    </div>
                    <input 
                      type="text" required pattern="^#[0-9a-fA-F]{6}$" value={newBrandHex} onChange={e => setNewBrandHex(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="#RRGGBB"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Pilih satu warna dasar. Algoritma HSL kami akan otomatis membuat rentang kecerahan (Shades 50-900) dan mencarikan warna harmoni/komplementer.
                  </p>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={resetAddBrandModal} className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors">Batal</button>
                  <button type="submit" className="flex-1 py-2 px-4 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors">Simpan Brand</button>
                </div>
              </form>
            ) : (
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Deskripsikan Produk/Aplikasi Anda</label>
                  <textarea 
                    value={aiBrandPrompt} onChange={e => setAiBrandPrompt(e.target.value)}
                    placeholder="Contoh: Aplikasi meditasi dan kesehatan mental yang menenangkan..."
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none"
                  />
                </div>
                
                <button 
                  type="button" 
                  onClick={generateBrandWithAI} 
                  disabled={isGeneratingBrand || !aiBrandPrompt.trim()} 
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 flex justify-center items-center gap-2 transition-all disabled:opacity-70"
                >
                  {isGeneratingBrand ? (
                    <span className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Meracik Brand...
                    </span>
                  ) : (
                    <><Wand2 size={16}/> Generate Warna & Nama</>
                  )}
                </button>
                
                {generatedBrandData && (
                  <div className="mt-4 p-4 bg-purple-50 border border-purple-100 rounded-lg animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full shadow-inner border border-gray-200 flex-shrink-0" style={{backgroundColor: generatedBrandData.primaryHex}}></div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-gray-900 truncate">{generatedBrandData.brandName}</h4>
                        <p className="text-xs font-mono text-purple-700 font-semibold">{generatedBrandData.primaryHex}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed italic border-l-2 border-purple-300 pl-3">
                      &quot;{generatedBrandData.rationale}&quot;
                    </p>
                    <button 
                      onClick={() => handleAddBrand(null)} 
                      className="mt-4 w-full py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Gunakan & Terapkan Tema
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EKSPOR FIGMA */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-pink-100 text-pink-600 rounded-lg"><Figma size={20} /></div>
                <div><h3 className="font-bold text-gray-900">Ekspor Tokens ({activeBrand.name})</h3><p className="text-xs text-gray-500">JSON Format (Tokens Studio / W3C Standard)</p></div>
              </div>
              <button onClick={() => setShowExportModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            <div className="p-5 flex-1 overflow-y-auto bg-gray-900 text-gray-100"><pre className="text-xs font-mono leading-relaxed whitespace-pre-wrap">{tokensJSON}</pre></div>
            <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500 max-w-xs">Salin atau unduh struktur JSON ini dan paste di Plugin Figma (Tokens Studio) Anda untuk sinkronisasi otomatis.</p>
              <div className="flex gap-3">
                <button onClick={() => handleCopy(tokensJSON, 'json-export')} className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                  {copiedVar === 'json-export' ? <CheckCircle2 size={16} className="text-green-600" /> : <Copy size={16} />}{copiedVar === 'json-export' ? 'Tersalin!' : 'Salin JSON'}
                </button>
                <button onClick={downloadJSON} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"><Download size={16} />Unduh .json</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EKSPOR PROMPT AI (GOOGLE STITCH / GEMINI CANVAS) */}
      {showAIPromptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh] border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-white to-indigo-50/30">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20"><Bot size={24} /></div>
                  <div>
                    <h3 className="font-black text-gray-900 text-xl tracking-tight">Design Tokens</h3>
                    <p className="text-xs text-gray-500 font-medium tracking-wide">Ready for Google Stitch, Project IDX & Gemini Canvas</p>
                  </div>
                </div>
                <button onClick={() => setShowAIPromptModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
              </div>

              <div className="bg-white/60 backdrop-blur-sm border border-indigo-100 rounded-2xl p-5 shadow-sm">
                <p className="text-sm text-indigo-950 leading-relaxed font-medium mb-3">
                  Anda adalah Frontend Developer dan UI/UX Expert. Anda HARUS menggunakan aturan Design System berikut untuk setiap komponen UI yang Anda buat.
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse"></span>
                  <p className="text-[11px] text-indigo-500 font-bold uppercase tracking-widest">
                    Source of Truth (JSON) for brand: {activeBrand.name}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-0 flex-1 overflow-y-auto bg-[#0f172a] relative">
              <div className="sticky top-0 right-0 p-4 flex justify-end z-20">
                 <div className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-bold text-gray-400 border border-white/5 uppercase tracking-widest">System Instructions & Tokens</div>
              </div>
              <pre className="p-8 text-sm font-mono leading-relaxed whitespace-pre-wrap text-indigo-300/90 selection:bg-indigo-500/30">
                {aiPromptText}
              </pre>
            </div>
            
            <div className="p-8 border-t border-gray-100 bg-white flex items-center justify-between">
              <div className="hidden sm:block">
                <p className="text-xs text-gray-400 max-w-[240px] leading-normal font-medium">
                  Salin seluruh JSON
                </p>
              </div>
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  onClick={() => handleCopy(aiPromptText, 'ai-prompt')} 
                  className="flex-1 sm:flex-none px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black rounded-2xl transition-all flex items-center justify-center gap-3 shadow-[0_15px_30px_rgba(79,70,229,0.25)] active:scale-95"
                >
                  {copiedVar === 'ai-prompt' ? <CheckCircle2 size={20} className="text-green-300" /> : <Copy size={20} />}
                  {copiedVar === 'ai-prompt' ? 'PROMPT COPIED' : 'COPY DESIGN TOKENS'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className={`fixed top-4 bottom-4 left-4 z-[100] bg-white border border-gray-100 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.06)] rounded-[12px] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSidebarOpen ? (isSidebarCollapsed ? 'w-[70px]' : 'w-64') : 'w-64 -translate-x-[calc(100%+3rem)]'}`}>
        
        {/* Toggle Button - Repositioned for no overlap */}
        <button 
          onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          className={`hidden lg:flex absolute -right-4 top-20 w-8 h-8 bg-white border border-gray-100 rounded-full shadow-lg items-center justify-center text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all z-[110] active:scale-90 group`}
          title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          <div className={`transition-transform duration-500 ${isSidebarCollapsed ? 'rotate-0' : 'rotate-180'}`}>
            <ChevronRight size={14} className="group-hover:scale-110 transition-transform" />
          </div>
        </button>

        <div className={`border-b border-gray-50 flex-shrink-0 transition-all duration-500 flex flex-col justify-center ${isSidebarCollapsed ? 'h-[100px] items-center' : 'p-7 h-[100px]'}`}>
          <div className="flex items-center justify-between w-full">
            <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center w-full' : 'gap-3'}`}>
              <div 
                className={`rounded-2xl text-white shadow-xl shadow-indigo-500/20 flex-shrink-0 transition-all duration-500 hover:scale-105 flex items-center justify-center ${isSidebarCollapsed ? 'w-11 h-11' : 'w-11 h-11'}`} 
                style={{ backgroundColor: cPrimary }}
              >
                <Layers size={22} />
              </div>
              
              {!isSidebarCollapsed && (
                <div className="animate-in fade-in duration-500">
                  <h1 className="font-black text-gray-900 tracking-tighter leading-none mb-1 text-xl whitespace-nowrap">DSM SID</h1>
                  <p className="text-[10px] text-indigo-500/60 font-black uppercase tracking-[0.2em] whitespace-nowrap">Design System</p>
                </div>
              )}
            </div>
            
            {/* Mobile Close Button */}
            {!isSidebarCollapsed && (
              <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={20} />
              </button>
            )}
          </div>
        </div>
        
        <nav className={`flex-grow py-6 overflow-y-auto overflow-x-hidden custom-scrollbar flex flex-col items-center group/nav`}>
          {['GENERAL', 'FOUNDATION', 'COMPONENTS', 'TOOLS'].map((group) => (
            <div key={group} className={`w-full flex flex-col items-center ${isSidebarCollapsed ? 'mb-4' : 'mb-8 px-4'}`}>
              <h3 className={`w-full px-3 mb-3 text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] transition-all duration-300 ${isSidebarCollapsed ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'}`}>
                {group}
              </h3>
              <div className={`flex flex-col gap-1 ${isSidebarCollapsed ? 'w-full items-center' : 'w-full'}`}>
                {tabs.filter(t => t.group === group).map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id} 
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center transition-all duration-300 relative group/item ${
                        isSidebarCollapsed 
                          ? 'w-11 h-11 justify-center rounded-2xl' 
                          : 'w-full gap-3 px-4 py-3 rounded-xl'
                      } ${
                        isActive 
                          ? (['ai', 'ai-gen', 'icon-gen', 'linter'].includes(tab.id) ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'bg-gray-100 text-gray-900 shadow-sm') 
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                      style={isActive && !['ai', 'ai-gen', 'icon-gen', 'linter'].includes(tab.id) ? { backgroundColor: cPrimaryLight, color: cPrimaryActive } : {}}
                    >
                      <Icon size={20} color={isActive ? (['ai', 'ai-gen', 'icon-gen', 'linter'].includes(tab.id) ? undefined : cPrimary) : undefined} className={`transition-all flex-shrink-0 ${isActive ? (['ai', 'ai-gen', 'icon-gen', 'linter'].includes(tab.id) ? 'text-indigo-600' : '') : 'text-gray-400 group-hover/item:text-gray-900'}`} />
                      
                      {!isSidebarCollapsed && (
                        <span className="font-bold whitespace-nowrap text-sm animate-in fade-in slide-in-from-left-2 duration-300">
                          {tab.label}
                        </span>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isSidebarCollapsed && (
                        <div className="absolute left-[70px] px-3 py-1.5 bg-gray-900 text-white text-[10px] font-bold rounded-lg opacity-0 translate-x-[-10px] pointer-events-none group-hover/item:opacity-100 group-hover/item:translate-x-2 transition-all whitespace-nowrap z-[200]">
                          {tab.label}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className={`px-6 py-4 border-t border-gray-50 mt-auto flex flex-col gap-4 overflow-hidden transition-all duration-500 ${isSidebarCollapsed ? 'items-center px-1' : ''}`}>
          <div className={`transition-all duration-500 whitespace-nowrap overflow-hidden ${isSidebarCollapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'}`}>
             <p className="text-[10px] text-gray-400 font-medium">
               © 2026 • Registered sketchdarisenk
             </p>
          </div>
          {isSidebarCollapsed && (
            <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></div>
          )}
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className={`flex-1 flex flex-col min-h-screen transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isSidebarOpen ? (isSidebarCollapsed ? 'lg:ml-[102px]' : 'lg:ml-72') : 'ml-0'} ${selectedComponent ? 'lg:mr-[316px]' : 'mr-0'}`}>
        
        {/* HEADER - Floating Glass Island Style */}
        {!(activeTab === 'ai' && messages.length === 0) && (
          <header className="sticky top-0 z-40 px-8 pt-6 pb-2 pointer-events-none">
            <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[24px] px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[0_20px_50px_rgba(0,0,0,0.04)] pointer-events-auto animate-in slide-in-from-top-4 duration-700 ease-out">
              <div className="flex items-center gap-5">
                <button 
                  onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                  className={`p-2.5 text-gray-500 hover:bg-white hover:shadow-md rounded-xl transition-all ${isSidebarOpen ? 'lg:hidden' : 'block'}`}
                >
                  <Menu size={20} />
                </button>
                
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-600 border border-gray-50 flex-shrink-0 transition-transform duration-500 hover:rotate-12">
                    {(() => {
                      const Icon = tabs.find(t => t.id === activeTab)?.icon || Layers;
                      return <Icon size={24} />;
                    })()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-indigo-500/60 uppercase tracking-[0.2em]">
                        {tabs.find(t => t.id === activeTab)?.group}
                      </span>
                      <span className="text-[10px] text-gray-300">/</span>
                      <span className="text-[10px] font-bold text-gray-400 capitalize whitespace-nowrap">
                        {tabs.find(t => t.id === activeTab)?.label}
                      </span>
                    </div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-3 tracking-tight">
                      {tabs.find(t => t.id === activeTab)?.label}
                      <span className="text-[10px] px-2.5 py-1 bg-white/50 text-indigo-600 rounded-full font-bold border border-indigo-100/50 shadow-sm backdrop-blur-md">{activeBrand.name}</span>
                    </h2>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!['ai', 'linter'].includes(activeTab) && (
                  <div className="relative hidden xl:block">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input 
                      type="text" 
                      placeholder="Search tokens..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="pl-11 pr-4 py-2.5 bg-white/50 border border-gray-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all w-64 shadow-sm" 
                    />
                  </div>
                )}
                
                <div className="h-8 w-px bg-gray-100 mx-2 hidden lg:block" />

                <div className="flex items-center gap-2">
                  <button 
                    onClick={openAIPromptModal} 
                    className="p-2.5 bg-white hover:bg-indigo-50 text-indigo-600 border border-gray-100 rounded-xl transition-all shadow-sm hover:shadow-indigo-500/10 active:scale-95 flex items-center gap-2"
                    title="Export AI Prompt"
                  >
                    <Bot size={18} />
                    <span className="text-xs font-bold hidden sm:inline pr-1">Prompt</span>
                  </button>

                  <button 
                    onClick={openExportModal} 
                    className="p-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl transition-all shadow-lg shadow-gray-900/10 active:scale-95 flex items-center gap-2"
                    title="Export to Figma"
                  >
                    <Figma size={18} className="text-pink-400" />
                    <span className="text-xs font-bold hidden sm:inline pr-1">Save Kit</span>
                  </button>
                </div>
              </div>
            </div>
          </header>
        )}

        {/* AREA KONTEN - Workspace Canvas Style */}
        <div className={`flex-1 overflow-y-auto relative ${(activeTab === 'ai' && messages.length === 0) ? 'p-0' : 'p-8 lg:p-12'}`}>
          
          {/* Subtle Workspace Background UI */}
          <div className="fixed inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: `radial-gradient(#4f46e5 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }}></div>
          
          {/* Ambient Glows for the workspace */}
          {!(activeTab === 'ai' && messages.length === 0) && (
            <>
              <div className="fixed top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-100/20 rounded-full blur-[120px] pointer-events-none animate-pulse"></div>
              <div className="fixed bottom-[10%] right-[10%] w-[400px] h-[400px] bg-blue-100/20 rounded-full blur-[100px] pointer-events-none"></div>
            </>
          )}

          <div className={`relative z-10 ${(activeTab === 'ai' && messages.length === 0) ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
            {activeTab === 'colors' && renderColors()}
            {activeTab === 'typography' && renderTypography()}
            {activeTab === 'spacing' && renderSpacing()}
            {activeTab === 'radius' && renderRadius()}
            {activeTab === 'components' && renderComponents()}
            {activeTab === 'ai-gen' && renderAIComponentGenerator()}
            {activeTab === 'icon-gen' && renderIconGenerator()}
            {activeTab === 'linter' && renderLinter()}
            {activeTab === 'patterns' && renderPatterns()}
            {activeTab === 'tokens' && renderTokens()}
            {activeTab === 'resources' && renderResources()}
            {activeTab === 'ai' && renderAIAssistant()}
          </div>
        </div>
      </main>

      {selectedComponent && renderRightSidebar()}

    </div>
  );
}
