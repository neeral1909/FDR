import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      dashboard: "Dashboard",
      register: "Register Deposit",
      verify: "Verify FDR",
      risk: "Risk Analysis",
      maturity: "Maturity Date",
      amount: "Deposit Amount",
      upload: "Upload FDR Document",
      scan: "Scan QR Code",
      high: "High Risk",
      medium: "Medium Risk",
      low: "Low Risk",
      duplicate: "Possible Duplicate Detected",
      language: "Language"
    }
  },

  hi: {
    translation: {
      dashboard: "डैशबोर्ड",
      register: "जमा पंजीकरण",
      verify: "FDR सत्यापित करें",
      risk: "जोखिम विश्लेषण",
      maturity: "परिपक्वता तिथि",
      amount: "जमा राशि",
      upload: "FDR दस्तावेज़ अपलोड करें",
      scan: "QR कोड स्कैन करें",
      high: "उच्च जोखिम",
      medium: "मध्यम जोखिम",
      low: "कम जोखिम",
      duplicate: "संभावित डुप्लिकेट मिला",
      language: "भाषा"
    }
  },

  mr: {
    translation: {
      dashboard: "डॅशबोर्ड",
      register: "ठेव नोंदणी",
      verify: "FDR पडताळा",
      risk: "जोखीम विश्लेषण",
      maturity: "मुदतपूर्ती दिनांक",
      amount: "ठेव रक्कम",
      upload: "FDR दस्तऐवज अपलोड करा",
      scan: "QR कोड स्कॅन करा",
      high: "उच्च जोखीम",
      medium: "मध्यम जोखीम",
      low: "कमी जोखीम",
      duplicate: "संभाव्य डुप्लिकेट आढळले",
      language: "भाषा"
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false
  }
});

export default i18n;