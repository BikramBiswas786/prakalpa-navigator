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
            "description_bn": "বার্ষিক ₹২৫০০ বৃত্তি + ১৮ বছরে ₹৫০,০০০"
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
            "description_bn": "মাসিক ₹৬০০ শিশু লালনের জন্য"
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
            "description_bn": "বার্ষিক বৃত্তি ও স্বাস্থ্য সেবা"
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
            "description_bn": "গর্ভবতী মহিলাদের জন্য বিনামূল্যে পরিবহন"
        },
        "how_to_apply_bn": "স্থানীয় আঙ্গনওয়াড়ি বা স্বাস্থ্য কেন্দ্রে",
        "documents_bn": ["মাতৃত্ব কার্ড", "আধার"],
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
            "description_bn": "বার্ষিক ₹५०००  মহিলা স্বয়ংসেবক দল সদস্যদের"
        },
        "how_to_apply_bn": "SHG অফিস বা পঞ্চায়েতে",
        "documents_bn": ["SHG সদস্যপত্র", "ব্যাংক পাসবুক"],
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
            "description_bn": "গৃহহীনদের জন্য ₹२.५ লক্ষ ভূমি ও নির্মাণ সহায়তা"
        },
        "how_to_apply_bn": "BDO অফিসে আবেদন করুন",
        "documents_bn": ["আয়ের সার্টিফিকেট", "নিবাস প্রমাণ"],
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
            "description_bn": "বার্ষিক ₹५००० বৃত্তি"
        },
        "how_to_apply_bn": "স্কুলের মাধ্যমে",
        "documents_bn": ["স্কুল আইডি", "জাতি সার্টিফিকেট"],
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
            "description_bn": "₹১০ লক্ষ পর্যন্ত শিক্ষা ঋণ (০% সুদ)"
        },
        "how_to_apply_bn": "ব্যাংক বা শিক্ষা বিভাগে",
        "documents_bn": ["স্কুল সার্টিফিকেট", "অভিভাবকের পরিচয়"],
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
            "description_bn": "ক্লাস IX-XII শিক্ষার্থীদের বিনামূল্যে সাইকেল"
        },
        "how_to_apply_bn": "স্কুলের মাধ্যমে",
        "documents_bn": ["স্টুডেন্ট আইডি"],
        "official_link": "https://schooleducation.wb.gov.in/"
    },
    {
        "id": 12,
        "name_bn": "স্বামী বিবেকানন্দ বৃত্তি",
        "name_en": "Swami Vivekananda Scholarship",
        "category": "education",
        "eligibility": {
            "age_min": 14,
            "age_max": 25,
            "occupation": "student"
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "প্রতি বছর ₹५००० মেধা ভিত্তিক বৃত্তি"
        },
        "how_to_apply_bn": "স্কুল/কলেজের মাধ্যমে",
        "documents_bn": ["পাসের সার্টিফিকেট", "মার্কশীট"],
        "official_link": "https://scholarships.gov.in/"
    },
    {
        "id": 13,
        "name_bn": "ঐক্যশ্রী বৃত্তি",
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
            "description_bn": "সংখ্যালঘু ছাত্রদের জন্য ₹५००० বৃত্তি"
        },
        "how_to_apply_bn": "স্কুল/কলেজে",
        "documents_bn": ["ধর্মীয় পরিচয়পত্র", "মার্কশীট"],
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
            "description_bn": "IIT/JEE আকাঙ্ক্ষীদের বিনামূল্যে কোচিং"
        },
        "how_to_apply_bn": "WBJEE অফিসে",
        "documents_bn": ["স্টুডেন্ট আইডি", "বাসস্থান প্রমাণ"],
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
            "description_bn": "প্রতি ঋতু ₹१००००  ফসলের ক্ষতির বিপরীতে"
        },
        "how_to_apply_bn": "কৃষি বিভাগ বা দুয়ারে সরকার",
        "documents_bn": ["জমির দলিল", "আধার"],
        "official_link": "https://krishakbandhu.net/"
    },
    {
        "id": 16,
        "name_bn": "বাংলা শস্য বীমা",
        "name_en": "Bangla Shasya Bima",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer"
        },
        "benefits": {
            "amount": 50000,
            "description_bn": "ফসলের বীমা কভার ₹५००००"
        },
        "how_to_apply_bn": "বীমা অফিসে",
        "documents_bn": ["জমির নথি", "ফসলের রেকর্ড"],
        "official_link": "https://pmfby.gov.in/"
    },
    {
        "id": 17,
        "name_bn": "আমার ফসল আমার গোলা",
        "name_en": "Amar Fasal Amar Gola",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer",
            "income_max": 500000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "গোডাউন সুবিধা ও ঋণের ব্যবস্থা"
        },
        "how_to_apply_bn": "কৃষি বিভাগ",
        "documents_bn": ["কৃষক আইডি", "জমির তালিকা"],
        "official_link": "https://agriculture.wb.gov.in/"
    },
    {
        "id": 18,
        "name_bn": "আমার ফসল আমার গাড়ি",
        "name_en": "Amar Fasal Amar Gadi",
        "category": "agriculture",
        "eligibility": {
            "occupation": "farmer",
            "income_max": 500000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "কৃষকদের পরিবহন সহায়তা"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা কৃষি অফিস",
        "documents_bn": ["কৃষক পরিচয়", "আয়ের সার্টিফিকেট"],
        "official_link": "https://agriculture.wb.gov.in/"
    },
    {
        "id": 19,
        "name_bn": "কৃষক বার্ধক্য ভাতা",
        "name_en": "Krishak Bardhakyia Bhatta",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "occupation": "farmer",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "মাসিক পেনশন ₹१०००"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা বিভাগীয় অফিস",
        "documents_bn": ["বয়স প্রমাণ", "কৃষক আইডি"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },

    # ========== FISHERIES SCHEMES (4) ==========
    {
        "id": 20,
        "name_bn": "মৎস্যজীবী বন্ধু",
        "name_en": "Matsyajeebi Bandhu",
        "category": "fisheries",
        "eligibility": {
            "occupation": "fisherman",
            "income_max": 300000
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "মাসিক সহায়তা ₹५०००"
        },
        "how_to_apply_bn": "মৎস্য দপ্তর",
        "documents_bn": ["ফিশিং লাইসেন্স", "আধার"],
        "official_link": "https://fisheries.wb.gov.in/"
    },
    {
        "id": 21,
        "name_bn": "মৎস্যজীবী ক্রেডিট কার্ড",
        "name_en": "Matsyajeebi Credit Card",
        "category": "fisheries",
        "eligibility": {
            "occupation": "fisherman"
        },
        "benefits": {
            "amount": 500000,
            "description_bn": "₹५ লক্ষ পর্যন্ত ঋণ (৩% সুদ)"
        },
        "how_to_apply_bn": "ব্যাংক বা মৎস্য দপ্তর",
        "documents_bn": ["ফিশিং আইডি"],
        "official_link": "https://fisheries.wb.gov.in/"
    },
    {
        "id": 22,
        "name_bn": "সমুদ্র সাথী",
        "name_en": "Samudra Sathi",
        "category": "fisheries",
        "eligibility": {
            "occupation": "fisherman"
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "মৌসুমী বন্ধ সময় ₹५००० মাসিক"
        },
        "how_to_apply_bn": "মৎস্য সমবায় সমিতি",
        "documents_bn": ["ফিশিং লাইসেন্স", "ব্যাংক অ্যাকাউন্ট"],
        "official_link": "https://fisheries.wb.gov.in/"
    },
    {
        "id": 23,
        "name_bn": "মৎস্যজীবী বার্ধক্য ভাতা",
        "name_en": "Matsyajeebi Bardhakyia Bhatta",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "occupation": "fisherman",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "মাসিক পেনশন ₹१०००"
        },
        "how_to_apply_bn": "মৎস্য দপ্তর",
        "documents_bn": ["বয়স প্রমাণ", "কর্মজীবনের প্রমাণ"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },

    # ========== HEALTH SCHEMES (2) ==========
    {
        "id": 24,
        "name_bn": "স্বাস্থ্য সাথী",
        "name_en": "Swasthya Sathi",
        "category": "health",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 500000,
            "description_bn": "বার্ষিক ₹५ লক্ষ স্বাস্থ্য বীমা কভার"
        },
        "how_to_apply_bn": "দুয়ারে সরকার বা হাসপাতালে",
        "documents_bn": ["আয়ের সার্টিফিকেট", "পরিবারের তালিকা"],
        "official_link": "https://health.wb.gov.in/"
    },
    {
        "id": 25,
        "name_bn": "খাদ্য সাথী",
        "name_en": "Khadya Sathi",
        "category": "food_security",
        "eligibility": {
            "income_max": 200000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "বিনামূল্যে খাদ্য শস্য ও রেশনিং সুবিধা"
        },
        "how_to_apply_bn": "রেশন ডিলার বা BDO",
        "documents_bn": ["পরিবারের তালিকা", "আয়ের সার্টিফিকেট"],
        "official_link": "https://foodsupply.wb.gov.in/"
    },

    # ========== PENSION SCHEMES (6) ==========
    {
        "id": 26,
        "name_bn": "বার্ধক্য পেনশন",
        "name_en": "Old Age Pension",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "মাসিক ₹१००० বয়স্ক ভাতা"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা BDO অফিস",
        "documents_bn": ["বয়স প্রমাণ", "আয় সার্টিফিকেট"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 27,
        "name_bn": "বিধবা ভাতা",
        "name_en": "Widow Pension",
        "category": "pension",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "মাসিক ₹१००० বিধবা ভাতা"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা BDO",
        "documents_bn": ["বিবাহের নথি", "স্বামীর মৃত্য শংসাপত্র"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 28,
        "name_bn": "প্রতিবন্ধী পেনশন",
        "name_en": "Disability Pension",
        "category": "pension",
        "eligibility": {
            "age_min": 18,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "মাসিক ₹१००० প্রতিবন্ধী ভাতা"
        },
        "how_to_apply_bn": "বিভাগীয় অফিস",
        "documents_bn": ["প্রতিবন্ধিতা সার্টিফিকেট", "আয় প্রমাণ"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 29,
        "name_bn": "তপশিলী বন্ধু",
        "name_en": "Taposili Bandhu",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "caste": "sc",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "SC বয়স্কদের জন্য মাসিক ₹१०००"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা BDO",
        "documents_bn": ["বয়স প্রমাণ", "SC সার্টিফিকেট"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 30,
        "name_bn": "জয় জোহর",
        "name_en": "Jai Johar",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "caste": "st",
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "ST বয়স্কদের জন্য মাসিক ₹१०००"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা বিভাগীয় অফিস",
        "documents_bn": ["বয়স প্রমাণ", "ST সার্টিফিকেট"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 31,
        "name_bn": "মানবিক পেনশন",
        "name_en": "Manabik Pension",
        "category": "pension",
        "eligibility": {
            "age_min": 18,
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "সকল দরিদ্রের জন্য মাসিক ₹१०००"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা BDO",
        "documents_bn": ["আয় সার্টিফিকেট", "বাসস্থান প্রমাণ"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },

    # ========== HOUSING SCHEMES (2) ==========
    {
        "id": 32,
        "name_bn": "গীতাঞ্জলি আবাসন",
        "name_en": "Gitanjali Abassan",
        "category": "housing",
        "eligibility": {
            "income_max": 250000
        },
        "benefits": {
            "amount": 300000,
            "description_bn": "₹३ লক্ষ আবাসন সহায়তা"
        },
        "how_to_apply_bn": "হাউসিং বোর্ড বা BDO",
        "documents_bn": ["আয় সার্টিফিকেট", "ভূমি পত্র"],
        "official_link": "https://housing.wb.gov.in/"
    },
    {
        "id": 33,
        "name_bn": "আকাঙ্ক্ষা আবাসন",
        "name_en": "Akanksha Abassan",
        "category": "housing",
        "eligibility": {
            "income_max": 350000
        },
        "benefits": {
            "amount": 200000,
            "description_bn": "₹२ লক्ष নির্মাণ সহায়তা"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা হাউসিং বোর্ড",
        "documents_bn": ["ভূমির নথি", "আয় প্রমাণ"],
        "official_link": "https://housing.wb.gov.in/"
    },

    # ========== EMPLOYMENT & BUSINESS SCHEMES (4) ==========
    {
        "id": 34,
        "name_bn": "যুবশ্রী",
        "name_en": "Yuvasree",
        "category": "employment",
        "eligibility": {
            "age_min": 18,
            "age_max": 35,
            "occupation": "unemployed"
        },
        "benefits": {
            "amount": 15000,
            "description_bn": "প্রশিক্ষণের সময় মাসিক ₹१५०००"
        },
        "how_to_apply_bn": "দক্ষতা উন্নয়ন বোর্ড",
        "documents_bn": ["শিক্ষাগত যোগ্যতা", "বেকারত্ব সার্টিফিকেট"],
        "official_link": "https://skill.wb.gov.in/"
    },
    {
        "id": 35,
        "name_bn": "কর্মসাথী",
        "name_en": "Karma Sathi",
        "category": "entrepreneurship",
        "eligibility": {
            "age_min": 18,
            "age_max": 45,
            "occupation": ["unemployed", "self-employed"]
        },
        "benefits": {
            "amount": 1000000,
            "description_bn": "₹१० लक्ष স্টার্টআপ ঋণ (১% সুদ)"
        },
        "how_to_apply_bn": "ব্যাংক বা MSME অফিস",
        "documents_bn": ["ব্যবসায়িক পরিকল্পনা", "শিক্ষাগত যোগ্যতা"],
        "official_link": "https://msme.wb.gov.in/"
    },
    {
        "id": 36,
        "name_bn": "গতিধারা",
        "name_en": "Gati Dhara",
        "category": "transport",
        "eligibility": {
            "age_min": 18,
            "income_max": 400000
        },
        "benefits": {
            "amount": 150000,
            "description_bn": "টাক্সি/অটো চালকদের জন্য ₹१.५ लक्ष"
        },
        "how_to_apply_bn": "পরিবহন দপ্তর",
        "documents_bn": ["ড্রাইভিং লাইসেন্স", "যানবাহনের কাগজ"],
        "official_link": "https://transport.wb.gov.in/"
    },
    {
        "id": 37,
        "name_bn": "ভবিষ্যৎ ক্রেডিট কার্ড",
        "name_en": "Bhavishyat Credit Card",
        "category": "entrepreneurship",
        "eligibility": {
            "age_min": 18,
            "age_max": 50,
            "occupation": ["self-employed", "unemployed"]
        },
        "benefits": {
            "amount": 500000,
            "description_bn": "₹५ লক্ষ ০% সুদ ঋণ"
        },
        "how_to_apply_bn": "ব্যাংক বা MSME বোর্ড",
        "documents_bn": ["আধার", "ব্যবসায়িক প্রস্তাব"],
        "official_link": "https://msme.wb.gov.in/"
    },

    # ========== ARTISAN & CULTURE SCHEMES (3) ==========
    {
        "id": 38,
        "name_bn": "চা সুন্দরী",
        "name_en": "Cha Sundari",
        "category": "artisan",
        "eligibility": {
            "gender": "female",
            "occupation": "worker"
        },
        "benefits": {
            "amount": 0,
            "description_bn": "চা বাগানের মহিলা শ্রমিকদের জন্য আবাসন"
        },
        "how_to_apply_bn": "চা বোর্ড অফিস",
        "documents_bn": ["কর্মপত্র", "পরিচয় কার্ড"],
        "official_link": "https://teaboard.gov.in/"
    },
    {
        "id": 39,
        "name_bn": "কারিগর বার্ধক্য ভাতা",
        "name_en": "Karigara Bardhakyia Bhatta",
        "category": "pension",
        "eligibility": {
            "age_min": 60,
            "occupation": "worker",
            "income_max": 200000
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "কারিগরদের জন্য মাসিক ₹१०००"
        },
        "how_to_apply_bn": "বিভাগীয় অফিস বা পঞ্চায়েত",
        "documents_bn": ["বয়স প্রমাণ", "কর্মজীবনের সার্টিফিকেট"],
        "official_link": "https://labour.wb.gov.in/"
    },
    {
        "id": 40,
        "name_bn": "লোক প্রসার",
        "name_en": "Lok Prosar",
        "category": "culture",
        "eligibility": {
            "age_min": 18,
            "occupation": "artist"
        },
        "benefits": {
            "amount": 1000,
            "description_bn": "লোক শিল্পীদের জন্য মাসিক ₹१०००"
        },
        "how_to_apply_bn": "সংস্কৃতি বিভাগ",
        "documents_bn": ["শিল্পীর প্রশংসাপত্র", "কর্মজীবনের প্রমাণ"],
        "official_link": "https://culture.wb.gov.in/"
    },

    # ========== UTILITY & OTHER SCHEMES (5) ==========
    {
        "id": 41,
        "name_bn": "হাসির আলো",
        "name_en": "Hasir Alo",
        "category": "utility",
        "eligibility": {
            "income_max": 200000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "দরিদ্রদের জন্য বিনামূল্যে ৭৫ ইউনিট বিদ্যুৎ"
        },
        "how_to_apply_bn": "বিদ্যুৎ বিতরণ কোম্পানি",
        "documents_bn": ["আয় সার্টিফিকেট", "বিদ্যুৎ বিল"],
        "official_link": "https://wbsedcl.in/"
    },
    {
        "id": 42,
        "name_bn": "মা ক্যান্টিন",
        "name_en": "Ma Canteen",
        "category": "food",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 0,
            "description_bn": "সাশ্রয়ী মূল্যে ও পুষ্টিকর খাবার"
        },
        "how_to_apply_bn": "স্থানীয় ক্যান্টিনে",
        "documents_bn": ["কোনো ডকুমেন্ট প্রয়োজন নেই"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 43,
        "name_bn": "সবুজশ্রী",
        "name_en": "Sabuj Shree",
        "category": "environment",
        "eligibility": {
            "age_min": 0,
            "age_max": 1
        },
        "benefits": {
            "amount": 0,
            "description_bn": "প্রতিটি নবজাতকের জন্য একটি গাছ রোপণ"
        },
        "how_to_apply_bn": "হাসপাতাল বা স্বাস্থ্য কেন্দ্র",
        "documents_bn": ["জন্ম শংসাপত্র"],
        "official_link": "https://environment.wb.gov.in/"
    },
    {
        "id": 44,
        "name_bn": "শ্রমশ্রী",
        "name_en": "Shrama Shree",
        "category": "worker",
        "eligibility": {
            "age_min": 18,
            "occupation": "worker",
            "income_max": 300000
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "প্রবাসী শ্রমিকদের জন্য মাসিক ₹५०००"
        },
        "how_to_apply_bn": "শ্রম বিভাগ",
        "documents_bn": ["পরিচয় কার্ড", "পাসপোর্ট কপি"],
        "official_link": "https://labour.wb.gov.in/"
    },
    {
        "id": 45,
        "name_bn": "তারুণ্যের স্বপ্ন",
        "name_en": "Taruner Swapna",
        "category": "education",
        "eligibility": {
            "age_min": 16,
            "age_max": 25,
            "occupation": "student"
        },
        "benefits": {
            "amount": 10000,
            "description_bn": "ক্যারিয়ার উন্নয়নে ₹१००००"
        },
        "how_to_apply_bn": "স্কুল/কলেজ",
        "documents_bn": ["পরিচয় কার্ড", "আয় প্রমাণ"],
        "official_link": "https://schooleducation.wb.gov.in/"
    },
    {
        "id": 46,
        "name_bn": "সমব্যথী",
        "name_en": "Sambathi",
        "category": "welfare",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 2000,
            "description_bn": "অসহায় ব্যক্তির শেষকার সংস্কারে ₹२०००"
        },
        "how_to_apply_bn": "পঞ্চায়েত বা BDO",
        "documents_bn": ["মৃত্যু শংসাপত্র"],
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
                "district": "কলকাতা"
            }
        
        # Check eligibility
        eligible_schemes = check_eligibility(actor_input)
        
        # Prepare output
        output = {
            "citizen_profile": actor_input,
            "eligible_schemes_count": len(eligible_schemes),
            "eligible_schemes": eligible_schemes,
            "summary_bn": f"আপনার জন্য {len(eligible_schemes)}টি প্রকল্পা পাওয়া গেছে",
            "timestamp": "২০२५",
            "total_schemes_in_database": len(SCHEMES_DATABASE)
        }
        
        # Push results
        await Actor.push_data(output)
        Actor.log.info(f"✅ Prakalpa Navigator: Found {len(eligible_schemes)} eligible schemes for {actor_input.get('occupation')}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())

