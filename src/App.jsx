import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
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
  Plus
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

const stitchSvgWithDRD = (baseSvg, drd, title) => {
  if (!drd || typeof drd !== 'object') return baseSvg;
  
  try {
    // 1. Bersihkan SVG dasar
    let svgContent = (baseSvg || '').trim()
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

    const wrap = (text, x, y, lineHeight, maxChars) => {
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
    return `<svg width="800" height="1200" viewBox="0 0 800 1200" version="1.1" xmlns="http://www.w3.org/2000/svg">
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
    <line x1="32" y1="65" x2="688" y1="65" stroke="#f1f5f9" stroke-width="1" />
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#94A3B8">
      <tspan x="32" y="100">OBJECTIVE &amp; DESIGN RATIONALE</tspan>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="bold" fill="#1e293b">
      <tspan x="32" y="130">${wrap(obj, 32, 130, 24, 55)}</tspan>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#64748b" font-style="italic">
      <tspan x="32" y="240">${wrap(rat, 32, 240, 18, 80)}</tspan>
    </text>
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#94A3B8">
      <tspan x="32" y="400">ACCESSIBILITY (WCAG) / INTERACTION BEHAVIOR</tspan>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">
      <tspan x="32" y="425">${wrap(acc, 32, 425, 20, 35)}</tspan>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#475569">
      <tspan x="380" y="425">${wrap(beh, 380, 425, 20, 35)}</tspan>
    </text>
    
    <text font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="bold" fill="#94A3B8">
      <tspan x="32" y="520">DESIGN SYSTEM TOKENS</tspan>
    </text>
    <text font-family="Arial, Helvetica, sans-serif" font-size="12" fill="#3B82F6" font-weight="semibold">
      <tspan x="32" y="545">${tok}</tspan>
    </text>
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
  designVariables.colors.forEach(group => {
    group.tokens.forEach(t => {
      let val = t.value;
      if (t.alias && designVariables.colors.some(g => g.tokens.some(token => token.name === t.alias))) {
         val = `{color.${t.alias.replace('/', '.')}}`; 
      }
      setNestedObject(tokens, `color/${t.name}`, { value: val, type: "color", description: t.alias || "" });
    });
  });
  designVariables.spacing.forEach(t => { setNestedObject(tokens, `spacing/${t.name}`, { value: t.value, type: "spacing" }); });
  designVariables.radius.forEach(t => { setNestedObject(tokens, `borderRadius/${t.name}`, { value: t.value, type: "borderRadius" }); });
  designVariables.typography.forEach(t => {
     setNestedObject(tokens, `typography/${t.name}`, {
       value: { fontSize: t.size, lineHeight: t.lineHeight, fontFamily: "Inter", fontWeight: "Regular" }, type: "typography"
     });
  });
  return JSON.stringify(tokens, null, 2);
};

export default function App() {
  const [activeTab, setActiveTab] = useState('ai');
  const [copiedVar, setCopiedVar] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  
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
  
  const [showExportModal, setShowExportModal] = useState(false);
  const [tokensJSON, setTokensJSON] = useState('');

  // --- STATE UNTUK EKSPOR PROMPT AI ---
  const [showAIPromptModal, setShowAIPromptModal] = useState(false);
  const [aiPromptText, setAiPromptText] = useState('');

  const [messages, setMessages] = useState([
    { role: 'model', content: "Halo! Saya ✨ Asisten Design System Anda. Saya telah menghafal seluruh token Figma Anda. Tanyakan kepada saya untuk membuat komponen, memeriksa aksesibilitas, atau menyarankan warna!" }
  ]);
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
  const [showAiCodeModal, setShowAiCodeModal] = useState(false);
  const [activeModel, setActiveModel] = useState(GEMINI_MODELS[0]);

  const [compSubTab, setCompSubTab] = useState('figma'); 
  const [framework, setFramework] = useState('react'); 

  useEffect(() => {
    if (chatEndRef.current && activeTab === 'ai') {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeTab]);

  const handleCopy = (text, id = text) => {
    navigator.clipboard.writeText(text);
    setCopiedVar(id);
    setTimeout(() => setCopiedVar(null), 2000);
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
    const prompt = `Anda adalah Frontend Developer dan UI/UX Expert. Anda HARUS menggunakan aturan Design System berikut untuk setiap komponen UI yang Anda buat.

Berikut adalah Design Tokens (Single Source of Truth) dalam format JSON untuk brand: ${activeBrand.name}

\`\`\`json
${json}
\`\`\`

ATURAN WAJIB:
1. JANGAN pernah menggunakan warna hardcoded (seperti \`bg-[#123456]\`). Selalu petakan ke token terdekat.
2. Jika menggunakan Tailwind CSS, translasikan token ini menjadi inline style atau kelas Tailwind terdekat (contoh: gunakan \`style={{ backgroundColor: 'var(--color-brand-500)' }}\` atau konfigurasikan theme Tailwind).
3. Pertahankan konsistensi Border Radius (\`radius-md\`, \`radius-lg\`) dan Spacing sesuai file JSON di atas.`;
    
    setAiPromptText(prompt);
    setShowAIPromptModal(true);
  };

  const downloadJSON = () => {
    const blob = new Blob([tokensJSON], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeBrand.name.toLowerCase().replace(/\s+/g, '-')}-tokens.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'ai', label: 'Home / AI Assistant', icon: Sparkles },
    { id: 'colors', label: 'Warna', icon: Palette },
    { id: 'typography', label: 'Tipografi', icon: Type },
    { id: 'spacing', label: 'Spasi', icon: Ruler },
    { id: 'radius', label: 'Radius', icon: Square },
    { id: 'components', label: 'Komponen', icon: Layout },
    { id: 'linter', label: '✨ Token Linter', icon: Code2 },
  ];

  const ComponentPreview = ({ title, figmaSvg, children, id, isBlock = false }) => (
    <div className={`relative group ${isBlock ? 'w-full' : ''}`}>
      {title && <div className="text-xs text-gray-500 font-medium mb-3">{title}</div>}
      <div className={`relative ${isBlock ? 'block h-full' : 'inline-block'}`}>
        {children}
        {figmaSvg && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none flex flex-col items-center">
             <button 
               onClick={() => handleCopy(figmaSvg, id)}
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
    } catch (error) {
      alert("Gagal mengenerate komponen: " + error.message);
    } finally {
      setIsGeneratingComp(false);
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
    <div className="space-y-6">
      
      {/* BRAND SELECTOR HEADER */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex gap-2 overflow-x-auto w-full pb-2 sm:pb-0">
          {brands.map(brand => (
            <button
              key={brand.id}
              onClick={() => setActiveBrandId(brand.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                activeBrandId === brand.id 
                  ? 'bg-gray-900 text-white border-gray-900 shadow-md' 
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: brand.primaryHex }}></span>
              {brand.name}
            </button>
          ))}
        </div>
        <button 
          onClick={() => setShowAddBrandModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-full text-sm font-semibold transition-colors whitespace-nowrap"
        >
          <Plus size={16} /> Tambah Brand
        </button>
      </div>

      <div className="space-y-8">
        {currentDesignVariables.colors.map((group, idx) => (
          <div key={idx} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 border-b pb-2">{group.collection}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.tokens.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
                <div key={token.name} className="flex items-center p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-200 transition-all group">
                  <div className="w-12 h-12 rounded-lg border border-gray-200 shadow-inner mr-4 flex-shrink-0" style={{ backgroundColor: token.value }} />
                  <div className="flex-grow min-w-0">
                    <div className="font-medium text-gray-900 truncate">{token.name}</div>
                    <div className="text-xs text-gray-500 font-mono truncate">{token.value.toUpperCase()} {token.alias && `(alias: ${token.alias})`}</div>
                  </div>
                  <button onClick={() => handleCopy(token.var)} className="p-2 text-gray-400 hover:text-blue-600 rounded-md opacity-0 group-hover:opacity-100 transition-opacity" title="Salin Variabel CSS">
                    {copiedVar === token.var ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTypography = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead className="bg-gray-50 text-gray-600 text-sm">
          <tr><th className="p-4 font-medium border-b border-gray-200">Nama Token</th><th className="p-4 font-medium border-b border-gray-200 hidden md:table-cell">Properti</th><th className="p-4 font-medium border-b border-gray-200">Pratinjau</th><th className="p-4 font-medium border-b border-gray-200 w-16"></th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {currentDesignVariables.typography.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
            <tr key={token.name} className="hover:bg-gray-50 group">
              <td className="p-4 font-mono text-sm text-gray-800">{token.name}</td>
              <td className="p-4 text-xs text-gray-500 hidden md:table-cell"><div>Ukuran: {token.size}</div><div>Tinggi baris: {token.lineHeight}</div></td>
              <td className="p-4"><span className="text-gray-900" style={{ fontSize: token.size, lineHeight: token.lineHeight }}>Desain merubah dunia</span></td>
              <td className="p-4 text-right"><button onClick={() => handleCopy(token.var)} className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100">{copiedVar === token.var ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSpacing = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden p-6">
      <div className="space-y-6">
        {currentDesignVariables.spacing.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
          <div key={token.name} className="flex items-center group">
            <div className="w-32 flex-shrink-0"><div className="font-mono text-sm text-gray-800">{token.name}</div><div className="text-xs text-gray-500">{token.value} / {token.rem}</div></div>
            <div className="flex-grow flex items-center"><div className="bg-blue-100 border border-blue-300 rounded-sm" style={{ width: token.value, height: '24px', backgroundColor: cPrimaryLightBorder, borderColor: cPrimary }} /></div>
            <button onClick={() => handleCopy(token.var)} className="ml-4 p-2 text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100">{copiedVar === token.var ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderRadius = () => (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
      {currentDesignVariables.radius.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map((token) => (
        <div key={token.name} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center group hover:border-blue-300 transition-colors">
          <div className="w-20 h-20 mb-4 border-2" style={{ borderRadius: token.value, backgroundColor: cPrimary, borderColor: cPrimaryActive }} />
          <div className="font-mono text-sm text-gray-800 mb-1">{token.name}</div>
          <div className="text-xs text-gray-500 mb-3">{token.value}</div>
          <button onClick={() => handleCopy(token.var)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-blue-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">{copiedVar === token.var ? <CheckCircle2 size={12} className="text-green-500" /> : <Copy size={12} />}{copiedVar === token.var ? 'Disalin!' : 'Salin Var'}</button>
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
            <Figma size={12} className="text-pink-500"/> Arahkan kursor & klik 'Copy to Figma'
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
                  <ComponentPreview id="btn-pri-def" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="${cPrimary}"/><text x="45" y="24" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
                    <button style={{ backgroundColor: cPrimary }} className="text-white font-medium py-2 px-4 rounded-md w-[90px] transition-colors hover:opacity-90">Button</button>
                  </ComponentPreview>
                </td>
                <td className="py-6 align-middle">
                  <ComponentPreview id="btn-pri-hov" figmaSvg={`<svg width="90" height="38" xmlns="http://www.w3.org/2000/svg"><rect width="90" height="38" rx="6" fill="${cPrimaryHover}"/><text x="45" y="24" fill="white" font-family="Inter, sans-serif" font-size="14" font-weight="500" text-anchor="middle">Button</text></svg>`}>
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
              figmaSvg={`<svg width="400" height="230" fill="none" xmlns="[http://www.w3.org/2000/svg](http://www.w3.org/2000/svg)">
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
        <button onClick={() => setCompSubTab('ai-gen')} className={`pb-3 text-sm font-medium transition-colors flex items-center gap-2 border-b-2 ${compSubTab === 'ai-gen' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}><Sparkles size={16} /> AI Component Generator</button>
      </div>
      {compSubTab === 'figma' && renderFigmaComponents()}
      {compSubTab === 'code' && renderCodeComponents()}
      {compSubTab === 'ai-gen' && renderAIComponentGenerator()}
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
                Arahkan kursor ke komponen untuk tombol "Copy to Figma"
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
              <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center space-y-3"><Check size={48} className="text-gray-200" /><p className="text-sm">Belum ada hasil linter.<br/>Klik "Jalankan Linter" untuk memulai analisis kode.</p></div>
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

  const renderAIAssistant = () => (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-180px)] overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><Sparkles className="text-blue-600" size={20} /> Asisten Design System (Copilot)</h3>
        <p className="text-sm text-gray-500">Konteks AI saat ini mengacu pada: <b>{activeBrand.name}</b>.</p>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? '' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white'}`} style={msg.role === 'user' ? {backgroundColor: cPrimaryLight, color: cPrimaryActive} : {}}>
              {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>
            <div className={`max-w-[80%] rounded-2xl p-4 shadow-sm ${msg.role === 'user' ? 'rounded-tr-none font-medium' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'}`} style={msg.role === 'user' ? {backgroundColor: cPrimaryLight, color: cPrimaryActive} : {}}>
              {formatMessage(msg.content)}
            </div>
          </div>
        ))}
        {isLoadingChat && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center flex-shrink-0"><Bot size={16} /></div>
            <div className="bg-white border border-gray-200 text-gray-500 rounded-2xl rounded-tl-none p-4 shadow-sm flex items-center gap-2"><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleAISubmit} className="flex gap-2 relative">
          <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Contoh: Buatkan komponen kartu notifikasi..." className="flex-1 bg-gray-50 border border-gray-200 rounded-xl pl-4 pr-12 py-3 focus:outline-none focus:ring-2 focus:border-blue-500 transition-all" style={{ '--tw-ring-color': cPrimary }} disabled={isLoadingChat} />
          <button type="submit" disabled={isLoadingChat || !inputValue.trim()} style={{ backgroundColor: cPrimary }} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-white rounded-lg disabled:opacity-50 transition-colors hover:opacity-90"><Send size={18} /></button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row text-gray-900 font-sans">
      
      {/* MODAL TAMBAH BRAND (THEMING) - DILENGKAPI AI GENERATOR */}
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
                      "{generatedBrandData.rationale}"
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gradient-to-r from-indigo-50 to-purple-50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600 text-white rounded-lg"><Bot size={20} /></div>
                <div>
                  <h3 className="font-bold text-gray-900">Ekspor Master Prompt AI</h3>
                  <p className="text-xs text-gray-600">Untuk Google Stitch, Project IDX, dan Gemini Canvas</p>
                </div>
              </div>
              <button onClick={() => setShowAIPromptModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"><X size={20} /></button>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto bg-gray-900 text-gray-100">
              <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap">
                {aiPromptText}
              </pre>
            </div>
            
            <div className="p-5 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <p className="text-xs text-gray-500 max-w-sm">
                Salin teks ini dan jadikan <b>System Instructions</b> atau pesan pertama Anda saat meminta AI (*Prompting*) membuat komponen UI.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => handleCopy(aiPromptText, 'ai-prompt')} 
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm"
                >
                  {copiedVar === 'ai-prompt' ? <CheckCircle2 size={16} className="text-green-300" /> : <Copy size={16} />}
                  {copiedVar === 'ai-prompt' ? 'Prompt Tersalin!' : 'Salin Master Prompt'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="p-2 rounded-lg text-white" style={{ backgroundColor: cPrimary }}><Layers size={20} /></div>
          <div><h1 className="font-bold text-gray-900 tracking-tight">dsm-sid</h1><p className="text-xs text-gray-500">Variabel & Token</p></div>
        </div>
        
        <nav className="p-4 flex-grow space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? (tab.id === 'ai' || tab.id === 'linter' ? 'bg-indigo-50 text-indigo-700' : 'bg-gray-100 text-gray-900 font-semibold') : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                style={isActive && tab.id !== 'ai' && tab.id !== 'linter' ? { backgroundColor: cPrimaryLight, color: cPrimaryActive } : {}}
              >
                <Icon size={18} color={isActive ? (tab.id === 'ai' || tab.id === 'linter' ? undefined : cPrimary) : undefined} className={isActive ? (tab.id === 'ai' || tab.id === 'linter' ? 'text-indigo-600' : '') : 'text-gray-400'} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-6 border-t border-gray-100 mt-auto">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded uppercase tracking-wider border border-gray-200">v1.2.4-stable</span>
            </div>
            <p className="text-[11px] text-gray-600 font-semibold tracking-tight">
              sketchdarisenk.design
            </p>
            <p className="text-[10px] text-gray-400">
              © 2026 • All Rights Reserved
            </p>
          </div>
        </div>
      </aside>

      {/* KONTEN UTAMA */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        
        {/* HEADER */}
        <header className="bg-white border-b border-gray-200 px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10 shadow-sm">
          <div>
            <h2 className="text-2xl font-semibold capitalize text-gray-800 flex items-center gap-3">
              {tabs.find(t => t.id === activeTab)?.label}
              <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md font-medium border border-gray-200">{activeBrand.name}</span>
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'ai' || activeTab === 'linter' ? "Fitur kecerdasan buatan bertenaga Gemini API untuk membantu alur kerja Anda." : "Jelajahi, salin variabel CSS, dan lihat komponen antarmuka yang siap digunakan."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {!['ai', 'linter'].includes(activeTab) && (
              <div className="relative hidden lg:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input type="text" placeholder="Cari variabel..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ '--tw-ring-color': cPrimary }} className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:bg-white transition-all w-64" />
              </div>
            )}
            
            {/* TOMBOL EKSPOR AI */}
            <button onClick={openAIPromptModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-sm font-semibold rounded-lg transition-colors shadow-sm">
              <Bot size={16} /><span className="hidden sm:inline">Ekspor AI Prompt</span>
            </button>

            {/* TOMBOL EKSPOR FIGMA */}
            <button onClick={openExportModal} className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors shadow-sm">
              <Figma size={16} className="text-pink-400" /><span className="hidden sm:inline">Ekspor Figma</span>
            </button>
          </div>
        </header>

        {/* AREA KONTEN */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'colors' && renderColors()}
            {activeTab === 'typography' && renderTypography()}
            {activeTab === 'spacing' && renderSpacing()}
            {activeTab === 'radius' && renderRadius()}
            {activeTab === 'components' && renderComponents()}
            {activeTab === 'linter' && renderLinter()}
            {activeTab === 'ai' && renderAIAssistant()}
          </div>
        </div>
      </main>

    </div>
  );
}
