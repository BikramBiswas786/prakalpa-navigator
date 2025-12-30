# -*- coding: utf-8 -*-
import json
from apify import Actor

SCHEMES_DATABASE = [
    # ========== WOMEN & GIRL CHILD SCHEMES (8) ==========
    {
        "id": 1,
        "name_bn": "লক্ষ্মীর ভাণ্ডার",
        "name_en": "Lakshmir Bhandar",
        "category": "women",
        "eligibility": {
            "age_min": 25,
            "age_max": 60,
            "gender": "female",
            "caste": ["sc", "st", "obc"],
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "প্রতি মাসে ₹১০০০ সরাসরি ব্যাংক অ্যাকাউন্টে"
        },
        "how_to_apply_bn": "দুয়ারে সরকার ক্যাম্প বা BDO অফিসে",
        "documents_bn": ["আধার", "ব্যাংক পাসবুক", "আয়ের সার্টিফিকেট"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 2,
        "name_bn": "কন্যাশ্রী প্রকল্প",
        "name_en": "Kanyashree Prakalpa",
        "category": "girl_child",
        "eligibility": {
            "age_min": 13,
            "age_max": 18,
            "gender": "female",
            "income_max": 120000
        },
        "benefits": {
            "amount": 2500,
            "description_bn": "বার্ষিক ₹२५०० বৃত्ति + १८ वर्षे ₹५०,०००"
        },
        "how_to_apply_bn": "স্কুলের মাধ্যমে বা wbkanyashree.gov.in",
        "documents_bn": ["জন্ম শংসাপত্র", "আয়ের সার্টিফিকেট", "পিতামাতার পরিচয়"],
        "official_link": "https://www.wbkanyashree.gov.in/"
    },
    {
        "id": 3,
        "name_bn": "রূপাশ্রী প্রকল্প",
        "name_en": "Rupashree Prakalpa",
        "category": "women",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "age_max": 60,
            "caste": ["sc", "st", "obc"],
            "income_max": 300000
        },
        "benefits": {
            "amount": 25000,
            "description_bn": "বিবাহ অনুদান ₹२५,०००"
        },
        "how_to_apply_bn": "BDO অফিস বা সরকার দপ্তরে",
        "documents_bn": ["বিবাহের নথি", "আয়ের সার্টিফিকেট"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 4,
        "name_bn": "শিশু সাথী",
        "name_en": "Sishu Sathi",
        "category": "child",
        "eligibility": {
            "age_min": 0,
            "age_max": 6,
            "income_max": 200000
        },
        "benefits": {
            "amount": 600,
            "description_bn": "মাসিক ₹६०० শিশু লালনের জন্য"
        },
        "how_to_apply_bn": "দুয়ারে সরকার বা ICDS কেন্দ্রে",
        "documents_bn": ["জন্ম শংসাপত্র", "অভিভাবকের পরিচয়"],
        "official_link": "https://icds.wb.gov.in/"
    },
    {
        "id": 5,
        "name_bn": "সবলা প্রকল্প",
        "name_en": "Sabla Prakalpa",
        "category": "girl_child",
        "eligibility": {
            "age_min": 13,
            "age_max": 18,
            "gender": "female"
        },
        "benefits": {
            "amount": 2500,
            "description_bn": "বার্ষিক বৃত्ति ও স্বাস्थ्य सेवा"
        },
        "how_to_apply_bn": "স্কুল বা ICDS কেন্দ্রে",
        "documents_bn": ["স্কুল আইডি", "জন্ম শংসাপত্র"],
        "official_link": "https://icds.wb.gov.in/"
    },
    {
        "id": 6,
        "name_bn": "মাতৃযান",
        "name_en": "Matrivan",
        "category": "maternal_health",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "age_max": 50
        },
        "benefits": {
            "amount": 0,
            "description_bn": "গর्भवती মহिলাদের জন্য বিনামূল्য পরिवहन"
        },
        "how_to_apply_bn": "স্থানীয় আঙ্গনওয়াড়ি বা স্বাস্थ্য কেন্দ্রে",
        "documents_bn": ["মাতৃত्व कार्ड", "आधार"],
        "official_link": "https://health.wb.gov.in/"
    },
    {
        "id": 7,
        "name_bn": "জাগো",
        "name_en": "Jago Prakalpa",
        "category": "women",
        "eligibility": {
            "gender": "female",
            "age_min": 25,
            "age_max": 60
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "বার्ष़िक ₹५००० महिला स्वयंसेवक दल सदस्यों के लिए"
        },
        "how_to_apply_bn": "SHG অফিস বা পঞ্চায়েতে",
        "documents_bn": ["SHG सदस्यपत्र", "ব্যাংক পাসबुक"],
        "official_link": "https://wbshg.gov.in/"
    },
    {
        "id": 8,
        "name_bn": "নিজ গৃহ নিজ ভূমি",
        "name_en": "Nij Griha Nij Bhoomi",
        "category": "housing",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 250000,
            "description_bn": "গृहहीनों के लिए ₹२.५ लक्ष भूमि एवं निर्माण सहायता"
        },
        "how_to_apply_bn": "BDO অফিসে আবেদন করুন",
        "documents_bn": ["আয়ের सार्टिফिকेट", "निवास प्रमाण"],
        "official_link": "https://land.wb.gov.in/"
    },

    # ========== EDUCATION SCHEMES (6) ==========
    {
        "id": 9,
        "name_bn": "শিক্ষাশ্রী",
        "name_en": "Sikshashree",
        "category": "education",
        "eligibility": {
            "age_min": 10,
            "age_max": 14,
            "caste": ["sc", "st"],
            "occupation": "student"
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "বার्ष़िक ₹५००० छात्रवृत्ति"
        },
        "how_to_apply_bn": "স্কুলের मাध्यমে",
        "documents_bn": ["स्कूल आईडी", "जाति प्रमाणपत्र"],
        "official_link": "https://schooleducation.wb.gov.in/"
    },
    {
        "id": 10,
        "name_bn": "স্টুডেন্ট ক্রেডিট কার্ড",
        "name_en": "Student Credit Card",
        "category": "education",
        "eligibility": {
            "age_min": 14,
            "age_max": 40,
            "occupation": "student"
        },
        "benefits": {
            "amount": 1000000,
            "description_bn": "₹१० लक्ष तक शिक्षा ऋण (०% सुद)"
        },
        "how_to_apply_bn": "ব্যাংক বা শিক্ষা বिभाগে",
        "documents_bn": ["स्कूल प्रमाणपत्र", "अभिभावक की पहचान"],
        "official_link": "https://www.wbheducation.gov.in/"
    },
    {
        "id": 11,
        "name_bn": "সাবুজ সাথী",
        "name_en": "Sabooj Sathi",
        "category": "education",
        "eligibility": {
            "age_min": 14,
            "age_max": 18,
            "occupation": "student"
        },
        "benefits": {
            "amount": 0,
            "description_bn": "क्लास IX-XII छात्रों के लिए मुफ्त साइकिल"
        },
        "how_to_apply_bn": "স্কুলের মাধ্যমে",
        "documents_bn": ["स्टूडेंट आईडी"],
        "official_link": "https://schooleducation.wb.gov.in/"
    },
    {
        "id": 12,
        "name_bn": "স্বামী বিবেকানন्द বৃत्তি",
        "name_en": "Swami Vivekananda Scholarship",
        "category": "education",
        "eligibility": {
            "age_min": 14,
            "age_max": 25,
            "occupation": "student"
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "प्रति वर्ष ₹५००० योग्यता आधारित छात्रवृत्ति"
        },
        "how_to_apply_bn": "স্কूল/কলেজের মাধ্যমে",
        "documents_bn": ["पास प्रमाणपत्र", "मार्कशीट"],
        "official_link": "https://scholarships.gov.in/"
    },
    {
        "id": 13,
        "name_bn": "ঐক्যশ্রী বৃত्তि",
        "name_en": "Aikyashree Scholarship",
        "category": "education",
        "eligibility": {
            "age_min": 14,
            "age_max": 25,
            "caste": ["minority"],
            "occupation": "student"
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "अल्पसंख्यक छात्रों के लिए ₹५००० छात्रवृत्ति"
        },
        "how_to_apply_bn": "स्कूल/कॉलेज में",
        "documents_bn": ["धार्मिक पहचान", "मार्कशीट"],
        "official_link": "https://scholarships.gov.in/"
    },
    {
        "id": 14,
        "name_bn": "যোগ্যশ্রী",
        "name_en": "Yogyashree",
        "category": "education",
        "eligibility": {
            "age_min": 16,
            "age_max": 25,
            "occupation": "student"
        },
        "benefits": {
            "amount": 0,
            "description_bn": "IIT/JEE आकांक्षियों के लिए मुफ्त कोचिंग"
        },
        "how_to_apply_bn": "WBJEE অফিসে",
        "documents_bn": ["स्टूडेंट आईडी", "निवास प्रमाण"],
        "official_link": "https://wbjee.nic.in/"
    },

    # ========== AGRICULTURE SCHEMES (5) ==========
    {
        "id": 15,
        "name_bn": "কৃষক বন্ধু",
        "name_en": "Krishak Bandhu",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer",
            "income_max": 500000
        },
        "benefits": {
            "amount": 10000,
            "description_bn": "प्रति ऋतु ₹१०००० फसल नुकसान के विरुद्ध"
        },
        "how_to_apply_bn": "कृषि विभाग या दुआरे सरकार",
        "documents_bn": ["जमीन के कागजات", "आधार"],
        "official_link": "https://krishakbandhu.net/"
    },
    {
        "id": 16,
        "name_bn": "বাংলা শস्य बीমा",
        "name_en": "Bangla Shasya Bima",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer"
        },
        "benefits": {
            "amount": 50000,
            "description_bn": "फसल बीमा कवर ₹५००००"
        },
        "how_to_apply_bn": "बीमा कार्यालय में",
        "documents_bn": ["जमीन का दस्तावेज़", "फसल रिकॉर्ड"],
        "official_link": "https://pmfby.gov.in/"
    },
    {
        "id": 17,
        "name_bn": "আমার ফসল আমার गोला",
        "name_en": "Amar Fasal Amar Gola",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer",
            "income_max": 500000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "गोदाम सुविधा और ऋण की व्यवस्था"
        },
        "how_to_apply_bn": "कृषि विभाग",
        "documents_bn": ["किसान आईडी", "जमीन की सूची"],
        "official_link": "https://agriculture.wb.gov.in/"
    },
    {
        "id": 18,
        "name_bn": "আমার ফসल আমার गाड़ी",
        "name_en": "Amar Fasal Amar Gadi",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer",
            "income_max": 500000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "किसानों के लिए परिवहन सहायता"
        },
        "how_to_apply_bn": "पंचायत या कृषि कार्यालय",
        "documents_bn": ["किसान पहचान", "आय प्रमाण"],
        "official_link": "https://agriculture.wb.gov.in/"
    },
    {
        "id": 19,
        "name_bn": "कृषक वार्धक्य भत्ता",
        "name_en": "Krishak Bardhakyia Bhatta",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "occupation": "farmer",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "मासिक पेंशन ₹१०००"
        },
        "how_to_apply_bn": "पंचायत या विभागीय कार्यालय",
        "documents_bn": ["आयु प्रमाण", "किसान आईडी"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },

    # ========== FISHERIES SCHEMES (4) ==========
    {
        "id": 20,
        "name_bn": "मत्स्यजीवी बंधु",
        "name_en": "Matsyajeebi Bandhu",
        "category": "fisheries",
        "eligibility": {
            "occupation": "fisherman",
            "income_max": 300000
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "मासिक सहायता ₹५०००"
        },
        "how_to_apply_bn": "मछली विभाग",
        "documents_bn": ["मछली पकड़ने का लाइसेंस", "आधार"],
        "official_link": "https://fisheries.wb.gov.in/"
    },
    {
        "id": 21,
        "name_bn": "मत्स्यजीवी क्रेडिट कार्ड",
        "name_en": "Matsyajeebi Credit Card",
        "category": "fisheries",
        "eligibility": {
            "occupation": "fisherman"
        },
        "benefits": {
            "amount": 500000,
            "description_bn": "₹५ लक्ष तक ऋण (३% ब्याज)"
        },
        "how_to_apply_bn": "बैंक या मछली विभाग",
        "documents_bn": ["मछली आईडी"],
        "official_link": "https://fisheries.wb.gov.in/"
    },
    {
        "id": 22,
        "name_bn": "समुद्र साथी",
        "name_en": "Samudra Sathi",
        "category": "fisheries",
        "eligibility": {
            "occupation": "fisherman"
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "मौसमी बंद समय ₹५००० मासिक"
        },
        "how_to_apply_bn": "मछली सहकारी समिति",
        "documents_bn": ["मछली पकड़ने का लाइसेंस", "बैंक खाता"],
        "official_link": "https://fisheries.wb.gov.in/"
    },
    {
        "id": 23,
        "name_bn": "मत्स्यजीवी वार्धक्य भत्ता",
        "name_en": "Matsyajeebi Bardhakyia Bhatta",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "occupation": "fisherman",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "मासिक पेंशन ₹१०००"
        },
        "how_to_apply_bn": "मछली विभाग",
        "documents_bn": ["आयु प्रमाण", "कार्य जीवन प्रमाण"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },

    # ========== HEALTH SCHEMES (2) ==========
    {
        "id": 24,
        "name_bn": "स्वास्थ्य साथी",
        "name_en": "Swasthya Sathi",
        "category": "health",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 500000,
            "description_bn": "वार्षिक ₹५ लक्ष स्वास्थ्य बीमा कवर"
        },
        "how_to_apply_bn": "दुआरे सरकार या अस्पताल में",
        "documents_bn": ["आय प्रमाण", "परिवार की सूची"],
        "official_link": "https://health.wb.gov.in/"
    },
    {
        "id": 25,
        "name_bn": "खाद्य साथी",
        "name_en": "Khadya Sathi",
        "category": "food_security",
        "eligibility": {
            "income_max": 200000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "मुफ्त खाद्य अनाज और राशन सुविधा"
        },
        "how_to_apply_bn": "राशन डीलर या BDO",
        "documents_bn": ["परिवार की सूची", "आय प्रमाण"],
        "official_link": "https://foodsupply.wb.gov.in/"
    },

    # ========== PENSION SCHEMES (6) ==========
    {
        "id": 26,
        "name_bn": "वार्धक्य पेंशन",
        "name_en": "Old Age Pension",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "मासिक ₹१००० वृद्ध भत्ता"
        },
        "how_to_apply_bn": "पंचायत या BDO कार्यालय",
        "documents_bn": ["आयु प्रमाण", "आय प्रमाण"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 27,
        "name_bn": "विधवा भत्ता",
        "name_en": "Widow Pension",
        "category": "pension",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "मासिक ₹१००० विधवा भत्ता"
        },
        "how_to_apply_bn": "पंचायत या BDO",
        "documents_bn": ["विवाह दस्तावेज़", "पति की मृत्यु प्रमाण"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 28,
        "name_bn": "विकलांग पेंशन",
        "name_en": "Disability Pension",
        "category": "pension",
        "eligibility": {
            "age_min": 18,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "मासिक ₹१००० विकलांग भत्ता"
        },
        "how_to_apply_bn": "विभागीय कार्यालय",
        "documents_bn": ["विकलांगता प्रमाणपत्र", "आय प्रमाण"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 29,
        "name_bn": "तपसिली बंधु",
        "name_en": "Taposili Bandhu",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "caste": "sc",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "SC वृद्धों के लिए मासिक ₹१०००"
        },
        "how_to_apply_bn": "पंचायत या BDO",
        "documents_bn": ["आयु प्रमाण", "SC प्रमाणपत्र"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 30,
        "name_bn": "जय जोहर",
        "name_en": "Jai Johar",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "caste": "st",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "ST वृद्धों के लिए मासिक ₹१०००"
        },
        "how_to_apply_bn": "पंचायत या विभागीय कार्यालय",
        "documents_bn": ["आयु प्रमाण", "ST प्रमाणपत्र"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 31,
        "name_bn": "मानवीय पेंशन",
        "name_en": "Manabik Pension",
        "category": "pension",
        "eligibility": {
            "age_min": 18,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "सभी गरीबों के लिए मासिक ₹१०००"
        },
        "how_to_apply_bn": "पंचायत या BDO",
        "documents_bn": ["आय प्रमाण", "निवास प्रमाण"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },

    # ========== HOUSING SCHEMES (2) ==========
    {
        "id": 32,
        "name_bn": "गीतांजलि आवास",
        "name_en": "Gitanjali Abassan",
        "category": "housing",
        "eligibility": {
            "income_max": 250000
        },
        "benefits": {
            "amount": 300000,
            "description_bn": "₹३ लक्ष आवास सहायता"
        },
        "how_to_apply_bn": "हाउसिंग बोर्ड या BDO",
        "documents_bn": ["आय प्रमाण", "भूमि दस्तावेज़"],
        "official_link": "https://housing.wb.gov.in/"
    },
    {
        "id": 33,
        "name_bn": "आकांक्षा आवास",
        "name_en": "Akanksha Abassan",
        "category": "housing",
        "eligibility": {
            "income_max": 350000
        },
        "benefits": {
            "amount": 200000,
            "description_bn": "₹२ लक्ष निर्माण सहायता"
        },
        "how_to_apply_bn": "पंचायत या हाउसिंग बोर्ड",
        "documents_bn": ["भूमि दस्तावेज़", "आय प्रमाण"],
        "official_link": "https://housing.wb.gov.in/"
    },

    # ========== EMPLOYMENT & BUSINESS SCHEMES (4) ==========
    {
        "id": 34,
        "name_bn": "युवश्री",
        "name_en": "Yuvasree",
        "category": "employment",
        "eligibility": {
            "age_min": 18,
            "age_max": 35,
            "occupation": "unemployed"
        },
        "benefits": {
            "amount": 15000,
            "description_bn": "प्रशिक्षण के दौरान मासिक ₹१५०००"
        },
        "how_to_apply_bn": "कौशल विकास बोर्ड",
        "documents_bn": ["शैक्षणिक योग्यता", "बेरोजगारी प्रमाण"],
        "official_link": "https://skill.wb.gov.in/"
    },
    {
        "id": 35,
        "name_bn": "कर्मसाथी",
        "name_en": "Karma Sathi",
        "category": "entrepreneurship",
        "eligibility": {
            "age_min": 18,
            "age_max": 45,
            "occupation": ["unemployed", "self-employed"]
        },
        "benefits": {
            "amount": 1000000,
            "description_bn": "₹१० लक्ष स्टार्टअप ऋण (१% ब्याज)"
        },
        "how_to_apply_bn": "बैंक या MSME कार्यालय",
        "documents_bn": ["व्यावसायिक योजना", "शैक्षणिक योग्यता"],
        "official_link": "https://msme.wb.gov.in/"
    },
    {
        "id": 36,
        "name_bn": "गति धारा",
        "name_en": "Gati Dhara",
        "category": "transport",
        "eligibility": {
            "age_min": 18,
            "income_max": 400000
        },
        "benefits": {
            "amount": 150000,
            "description_bn": "टैक्सी/ऑटो चालकों के लिए ₹१.५ लक्ष"
        },
        "how_to_apply_bn": "परिवहन विभाग",
        "documents_bn": ["ड्राइविंग लाइसेंस", "वाहन दस्तावेज़"],
        "official_link": "https://transport.wb.gov.in/"
    },
    {
        "id": 37,
        "name_bn": "भविष्यत क्रेडिट कार्ड",
        "name_en": "Bhavishyat Credit Card",
        "category": "entrepreneurship",
        "eligibility": {
            "age_min": 18,
            "age_max": 50,
            "occupation": ["self-employed", "unemployed"]
        },
        "benefits": {
            "amount": 500000,
            "description_bn": "₹५ लक्ष ०% ब्याज ऋण"
        },
        "how_to_apply_bn": "बैंक या MSME बोर्ड",
        "documents_bn": ["आधार", "व्यावसायिक प्रस्ताव"],
        "official_link": "https://msme.wb.gov.in/"
    },

    # ========== ARTISAN & CULTURE SCHEMES (3) ==========
    {
        "id": 38,
        "name_bn": "चा सुंदरी",
        "name_en": "Cha Sundari",
        "category": "artisan",
        "eligibility": {
            "gender": "female",
            "occupation": "worker"
        },
        "benefits": {
            "amount": 0,
            "description_bn": "चाय बागानों की महिला श्रमिकों के लिए आवास"
        },
        "how_to_apply_bn": "चाय बोर्ड कार्यालय",
        "documents_bn": ["कार्य दस्तावेज़", "पहचान कार्ड"],
        "official_link": "https://teaboard.gov.in/"
    },
    {
        "id": 39,
        "name_bn": "कारीगर वार्धक्य भत्ता",
        "name_en": "Karigara Bardhakyia Bhatta",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "occupation": "worker",
            "income_max": 200000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "कारीगरों के लिए मासिक ₹१०००"
        },
        "how_to_apply_bn": "विभागीय कार्यालय या पंचायत",
        "documents_bn": ["आयु प्रमाण", "कार्य जीवन प्रमाण"],
        "official_link": "https://labour.wb.gov.in/"
    },
    {
        "id": 40,
        "name_bn": "लोक प्रसार",
        "name_en": "Lok Prosar",
        "category": "culture",
        "eligibility": {
            "age_min": 18,
            "occupation": "artist"
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "लोक कलाकारों के लिए मासिक ₹१०००"
        },
        "how_to_apply_bn": "संस्कृति विभाग",
        "documents_bn": ["कलाकार प्रशंसापत्र", "कार्य जीवन प्रमाण"],
        "official_link": "https://culture.wb.gov.in/"
    },

    # ========== UTILITY & OTHER SCHEMES (5) ==========
    {
        "id": 41,
        "name_bn": "हसीर आलो",
        "name_en": "Hasir Alo",
        "category": "utility",
        "eligibility": {
            "income_max": 200000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "गरीबों के लिए मुफ्त 75 यूनिट बिजली"
        },
        "how_to_apply_bn": "बिजली वितरण कंपनी",
        "documents_bn": ["आय प्रमाण", "बिजली बिल"],
        "official_link": "https://wbsedcl.in/"
    },
    {
        "id": 42,
        "name_bn": "मा कैंटीन",
        "name_en": "Ma Canteen",
        "category": "food",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "सस्ती और पौष्टिक भोजन"
        },
        "how_to_apply_bn": "स्थानीय कैंटीन में",
        "documents_bn": ["कोई दस्तावेज़ आवश्यक नहीं"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 43,
        "name_bn": "सबुज श्री",
        "name_en": "Sabuj Shree",
        "category": "environment",
        "eligibility": {
            "age_min": 0,
            "age_max": 1
        },
        "benefits": {
            "amount": 0,
            "description_bn": "प्रत्येक नवजात के लिए एक पेड़"
        },
        "how_to_apply_bn": "अस्पताल या स्वास्थ्य केंद्र",
        "documents_bn": ["जन्म प्रमाणपत्र"],
        "official_link": "https://environment.wb.gov.in/"
    },
    {
        "id": 44,
        "name_bn": "श्रम श्री",
        "name_en": "Shrama Shree",
        "category": "worker",
        "eligibility": {
            "age_min": 18,
            "occupation": "worker",
            "income_max": 300000
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "प्रवासी श्रमिकों के लिए मासिक ₹५०००"
        },
        "how_to_apply_bn": "श्रम विभाग",
        "documents_bn": ["पहचान कार्ड", "पासपोर्ट कॉपी"],
        "official_link": "https://labour.wb.gov.in/"
    },
    {
        "id": 45,
        "name_bn": "तारुण्य का स्वप्न",
        "name_en": "Taruner Swapna",
        "category": "education",
        "eligibility": {
            "age_min": 16,
            "age_max": 25,
            "occupation": "student"
        },
        "benefits": {
            "amount": 10000,
            "description_bn": "कैरियर विकास के लिए ₹१००००"
        },
        "how_to_apply_bn": "स्कूल/कॉलेज",
        "documents_bn": ["पहचान कार्ड", "आय प्रमाण"],
        "official_link": "https://schooleducation.wb.gov.in/"
    },
    {
        "id": 46,
        "name_bn": "सम्बथी",
        "name_en": "Sambathi",
        "category": "welfare",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 2000,
            "description_bn": "असहाय व्यक्ति के अंत्येष्टि में ₹२०००"
        },
        "how_to_apply_bn": "पंचायत या BDO",
        "documents_bn": ["मृत्यु प्रमाणपत्र"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    }
]

def check_eligibility(citizen_profile):
    """Check which schemes the citizen is eligible for"""
    eligible_schemes = []
    
    for scheme in SCHEMES_DATABASE:
        eligibility = scheme.get("eligibility", {})
        is_eligible = True
        
        # Age check
        if "age_min" in eligibility and eligibility["age_min"] > 0:
            if citizen_profile.get("age", 0) < eligibility["age_min"]:
                is_eligible = False
        
        if "age_max" in eligibility and eligibility["age_max"] > 0:
            if citizen_profile.get("age", 0) > eligibility["age_max"]:
                is_eligible = False
        
        # Gender check
        if "gender" in eligibility:
            if citizen_profile.get("gender") != eligibility["gender"]:
                is_eligible = False
        
        # Caste check
        if "caste" in eligibility:
            eligible_castes = eligibility["caste"] if isinstance(eligibility["caste"], list) else [eligibility["caste"]]
            if citizen_profile.get("caste") not in eligible_castes:
                is_eligible = False
        
        # Occupation check
        if "occupation" in eligibility:
            eligible_occupations = eligibility["occupation"] if isinstance(eligibility["occupation"], list) else [eligibility["occupation"]]
            if citizen_profile.get("occupation") not in eligible_occupations:
                is_eligible = False
        
        # Income check
        if "income_max" in eligibility and eligibility["income_max"] > 0:
            if citizen_profile.get("income_annual", 0) > eligibility["income_max"]:
                is_eligible = False
        
        if is_eligible:
            result = {
                "id": scheme["id"],
                "name_bn": scheme["name_bn"],
                "name_en": scheme["name_en"],
                "category": scheme["category"],
                "benefits_amount": scheme["benefits"]["amount"],
                "benefits_bn": scheme["benefits"]["description_bn"],
                "how_to_apply_bn": scheme["how_to_apply_bn"],
                "documents_bn": scheme["documents_bn"],
                "official_link": scheme["official_link"]
            }
            eligible_schemes.append(result)
    
    return eligible_schemes

async def main() -> None:
    """Main actor function"""
    async with Actor:
        actor_input = await Actor.get_input()
        
        # Default test input if none provided
        if not actor_input:
            actor_input = {
                "age": 35,
                "gender": "female",
                "income_annual": 0,
                "occupation": "housewife",
                "caste": "sc",
                "district": "कोलकाता"
            }
        
        # Check eligibility
        eligible_schemes = check_eligibility(actor_input)
        
        # Prepare output
        output = {
            "citizen_profile": actor_input,
            "eligible_schemes_count": len(eligible_schemes),
            "eligible_schemes": eligible_schemes,
            "summary_bn": f"आपके लिए {len(eligible_schemes)} प्रकल्प खोजे गए",
            "timestamp": "२०२५",
            "total_schemes_in_database": len(SCHEMES_DATABASE)
        }
        
        # Push results
        await Actor.push_data(output)
        Actor.log.info(f"✅ Prakalpa Navigator: Found {len(eligible_schemes)} eligible schemes for {actor_input.get('occupation')}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
