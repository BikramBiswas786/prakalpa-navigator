# -*- coding: utf-8 -*-
"""
প্রকল্পা নেভিগেটর - সরকারি প্রকল্পা যোগ্যতা পরীক্ষক
West Bengal Government Schemes Eligibility Checker
"""
import json
import asyncio
from apify import Actor

# 40 Government Schemes Database in Bengali
SCHEMES_DATABASE = [
    # WOMEN SCHEMES
    {
        "id": 1,
        "name_bn": "লক্ষ্মীর ভাণ্ডার",
        "name_en": "Lakshmir Bhandar",
        "category": "মহিলা",
        "description_bn": "মহিলাদের জন্য মাসিক ভাতা",
        "description_en": "Monthly allowance for women",
        "eligibility": {"age_min": 25, "age_max": 60, "gender": "female"},
        "benefits": {"amount": 1000, "frequency": "মাসিক", "amount_sc_st": 1200}
    },
    {
        "id": 2,
        "name_bn": "কন্যাশ্রী প্রকল্প",
        "name_en": "Kanyashree Prakalpa",
        "category": "কন্যা শিক্ষা",
        "description_bn": "মেয়েদের শিক্ষা ও বৈবাহিক অনুদান",
        "description_en": "Scholarship for girl children",
        "eligibility": {"age_min": 13, "age_max": 18, "gender": "female", "income_max": 120000},
        "benefits": {"amount": 1000, "frequency": "বার্ষিক", "one_time": 25000}
    },
    {
        "id": 3,
        "name_bn": "রূপাশ্রী প্রকল্প",
        "name_en": "Rupashree Prakalpa",
        "category": "মহিলা",
        "description_bn": "বিবাহের জন্য ২৫,০০০ টাকা অনুদান",
        "description_en": "Marriage grant for women",
        "eligibility": {"gender": "female", "age_min": 18, "age_max": 60, "income_max": 300000},
        "benefits": {"amount": 25000, "frequency": "এককালীন"}
    },
    {
        "id": 4,
        "name_bn": "শিশু সাথী",
        "name_en": "Sishu Sathi",
        "category": "শিশু",
        "description_bn": "ছোট শিশুদের জন্য মাসিক ৬০০ টাকা",
        "description_en": "Child support program",
        "eligibility": {"age_min": 0, "age_max": 6, "income_max": 200000},
        "benefits": {"amount": 600, "frequency": "মাসিক"}
    },
    {
        "id": 5,
        "name_bn": "সবলা প্রকল্প",
        "name_en": "Sabla Prakalpa",
        "category": "কন্যা শিক্ষা",
        "description_bn": "কিশোরী মেয়েদের জন্য ২,৫০০ টাকা বার্ষিক",
        "description_en": "Adolescent girl scheme",
        "eligibility": {"age_min": 13, "age_max": 18, "gender": "female"},
        "benefits": {"amount": 2500, "frequency": "বার্ষিক"}
    },
    {
        "id": 6,
        "name_bn": "মাতৃবান",
        "name_en": "Matrivan",
        "category": "স্বাস্থ্য",
        "description_bn": "গর্ভবতী মহিলাদের জন্য বিনামূল্যে পরিবহন",
        "description_en": "Free transport for pregnant women",
        "eligibility": {"gender": "female", "age_min": 18, "age_max": 50},
        "benefits": {"amount": 0, "frequency": "প্রয়োজন অনুযায়ী"}
    },
    {
        "id": 7,
        "name_bn": "জাগো প্রকল্প",
        "name_en": "Jago Prakalpa",
        "category": "মহিলা",
        "description_bn": "মহিলা স্বসহায়ক দল সমর্থন - ৫,০০০ টাকা বার্ষিক",
        "description_en": "Women self-help group support",
        "eligibility": {"gender": "female", "age_min": 25, "age_max": 60},
        "benefits": {"amount": 5000, "frequency": "বার্ষিক"}
    },
    
    # PENSION SCHEMES - তপশীলী বন্ধু ও জয় যোহার
    {
        "id": 8,
        "name_bn": "তপশীলী বন্ধু (অনুসূচিত জাতি)",
        "name_en": "Taposili Bandhu",
        "category": "পেনশন",
        "description_bn": "অনুসূচিত জাতির ৬০+ বছর বয়স্কদের ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension for SC senior citizens (60+)",
        "eligibility": {"age_min": 60, "caste": ["sc"], "income_max": 1000},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 9,
        "name_bn": "জয় যোহার (অনুসূচিত জনজাতি)",
        "name_en": "Jai Johar",
        "category": "পেনশন",
        "description_bn": "অনুসূচিত জনজাতির ৬০+ বছর বয়স্কদের ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension for ST senior citizens (60+)",
        "eligibility": {"age_min": 60, "caste": ["st"], "income_max": 1000},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 10,
        "name_bn": "বয়স্ক পেনশন (সকলের জন্য)",
        "name_en": "Old Age Pension",
        "category": "পেনশন",
        "description_bn": "সকল বয়স্ক ব্যক্তির জন্য ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension for all senior citizens (60+)",
        "eligibility": {"age_min": 60, "income_max": 1000},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 11,
        "name_bn": "বিধবা পেনশন",
        "name_en": "Widow Pension",
        "category": "পেনশন",
        "description_bn": "বিধবা মহিলাদের জন্য ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension for widows",
        "eligibility": {"gender": "female", "age_min": 25, "income_max": 1000},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 12,
        "name_bn": "মানবিক পেনশন (প্রতিবন্ধী)",
        "name_en": "Manabik Pension",
        "category": "পেনশন",
        "description_bn": "প্রতিবন্ধী ব্যক্তিদের জন্য ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension for disabled persons",
        "eligibility": {"age_min": 18, "disability": True, "income_max": 1000},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 13,
        "name_bn": "কৃষক বয়স্ক পেনশন",
        "name_en": "Farmer Old Age Pension",
        "category": "পেনশন",
        "description_bn": "কৃষকদের জন্য ১,০০০ টাকা মাসিক বয়স্ক পেনশন (৬০+ বছর)",
        "description_en": "Old age pension for farmers (60+)",
        "eligibility": {"age_min": 60, "occupation": "farmer", "land_max": 2},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 14,
        "name_bn": "মৎস্যজীবী পেনশন",
        "name_en": "Fisherman Old Age Pension",
        "category": "পেনশন",
        "description_bn": "মৎস্যজীবীদের জন্য ১,০০০ টাকা মাসিক পেনশন (৬০+ বছর)",
        "description_en": "Pension for fishermen (60+)",
        "eligibility": {"age_min": 60, "occupation": "fisherman"},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 15,
        "name_bn": "শিল্পী ও বুনকর পেনশন",
        "name_en": "Artisan & Weaver Pension",
        "category": "পেনশন",
        "description_bn": "নিবন্ধিত শিল্পী ও বুনকরদের জন্য ১,০০০ টাকা মাসিক পেনশন (৬০+)",
        "description_en": "Pension for artisans and weavers (60+)",
        "eligibility": {"age_min": 60, "occupation": ["artisan", "weaver"]},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 16,
        "name_bn": "লোক প্রসার প্রকল্প",
        "name_en": "Lok Prasar Prakalpa",
        "category": "পেনশন",
        "description_bn": "লোক শিল্পীদের জন্য ১,০০০ টাকা মাসিক পেনশন (৬০+)",
        "description_en": "Pension for folk artists (60+)",
        "eligibility": {"age_min": 60, "occupation": "folk_artist"},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    
    # HOUSING SCHEMES
    {
        "id": 17,
        "name_bn": "নিজ গৃহ নিজ ভূমি",
        "name_en": "Nij Griha Nij Bhoomi",
        "category": "আবাসন",
        "description_bn": "ভূমি মালিকানার জন্য ২,৫০,০০০ টাকা অনুদান",
        "description_en": "Land ownership assistance",
        "eligibility": {"income_max": 300000},
        "benefits": {"amount": 250000, "frequency": "এককালীন"}
    },
    {
        "id": 18,
        "name_bn": "বাঙ্গালো আবাস",
        "name_en": "Bangla Abash",
        "category": "আবাসন",
        "description_bn": "আবাসন সহায়তা - ৫,০০,০০০ টাকা পর্যন্ত",
        "description_en": "Housing assistance scheme",
        "eligibility": {"income_max": 300000},
        "benefits": {"amount": 500000, "frequency": "এককালীন"}
    },
    
    # EDUCATION SCHEMES
    {
        "id": 19,
        "name_bn": "শিক্ষাশ্রী",
        "name_en": "Shikhashree",
        "category": "শিক্ষা",
        "description_bn": "অনুসূচিত জাতি/জনজাতির ছাত্রদের ১,০০০ টাকা বার্ষিক বৃত্তি",
        "description_en": "Scholarship for SC/ST students",
        "eligibility": {"age_min": 10, "age_max": 18, "caste": ["sc", "st"], "class_min": 5},
        "benefits": {"amount": 1000, "frequency": "বার্ষিক"}
    },
    {
        "id": 20,
        "name_bn": "মেধাশ্রী",
        "name_en": "Medhashree",
        "category": "শিক্ষা",
        "description_bn": "অন্যান্য পিছিয়ে পড়া শ্রেণীর ছাত্রদের ১,০০০ টাকা বার্ষিক বৃত্তি",
        "description_en": "Scholarship for OBC students",
        "eligibility": {"age_min": 10, "age_max": 18, "caste": ["obc"], "class_min": 5},
        "benefits": {"amount": 1000, "frequency": "বার্ষিক"}
    },
    {
        "id": 21,
        "name_bn": "ছাত্র ঋণ কার্ড",
        "name_en": "Student Credit Card",
        "category": "শিক্ষা",
        "description_bn": "উচ্চশিক্ষার জন্য ১০,০০,০০০ টাকা পর্যন্ত ঋণ",
        "description_en": "Loan for higher education up to 10 lakhs",
        "eligibility": {"age_min": 18, "age_max": 40},
        "benefits": {"amount": 1000000, "frequency": "এককালীন"}
    },
    
    # FARMER SCHEMES
    {
        "id": 22,
        "name_bn": "কৃষক বন্ধু",
        "name_en": "Krishak Bandhu",
        "category": "কৃষি",
        "description_bn": "কৃষকদের জন্য ১০,০০০ টাকা বার্ষিক ও বীমা",
        "description_en": "Financial assistance and insurance for farmers",
        "eligibility": {"occupation": "farmer", "land_max": 5},
        "benefits": {"amount": 10000, "frequency": "বার্ষিক"}
    },
    {
        "id": 23,
        "name_bn": "আমার ফসল আমার গোলা",
        "name_en": "Amar Fasal Amar Gola",
        "category": "কৃষি",
        "description_bn": "ধান সংরক্ষণের জন্য ৫,০০০ টাকা বার্ষিক ভর্তুকি",
        "description_en": "Rice storage subsidy",
        "eligibility": {"occupation": "farmer"},
        "benefits": {"amount": 5000, "frequency": "বার্ষিক"}
    },
    
    # HEALTH SCHEMES
    {
        "id": 24,
        "name_bn": "স্বাস্থ্য সাথী",
        "name_en": "Swasthya Sathi",
        "category": "স্বাস্থ্য",
        "description_bn": "বিনামূল্যে স্বাস্থ্য বীমা - ৫,০০,০০০ টাকা পর্যন্ত",
        "description_en": "Health insurance scheme up to 5 lakhs",
        "eligibility": {"income_max": 600000},
        "benefits": {"amount": 500000, "frequency": "বার্ষিক"}
    },
    {
        "id": 25,
        "name_bn": "বয়স্ক নাগরিক স্বাস্থ্য",
        "name_en": "Senior Citizen Health",
        "category": "স্বাস্থ্য",
        "description_bn": "৬০+ বছর বয়স্কদের জন্য ৭,০০,০০০ টাকা স্বাস্থ্য বীমা",
        "description_en": "Health insurance for senior citizens (60+)",
        "eligibility": {"age_min": 60},
        "benefits": {"amount": 700000, "frequency": "বার্ষিক"}
    },
    
    # NATIONAL SCHEMES
    {
        "id": 26,
        "name_bn": "ইন্দিরা গান্ধী বয়স্ক পেনশন (৬০-৭৯)",
        "name_en": "IGNOAPS (60-79 years)",
        "category": "জাতীয়",
        "description_bn": "জাতীয় বয়স্ক পেনশন ৪০০ টাকা মাসিক (বিপিএল পরিবার)",
        "description_en": "National old age pension Rs. 400/month",
        "eligibility": {"age_min": 60, "age_max": 79, "income_status": "bpl"},
        "benefits": {"amount": 400, "frequency": "মাসিক"}
    },
    {
        "id": 27,
        "name_bn": "ইন্দিরা গান্ধী বয়স্ক পেনশন (৮০+)",
        "name_en": "IGNOAPS (80+ years)",
        "category": "জাতীয়",
        "description_bn": "জাতীয় বয়স্ক পেনশন ১,০০০ টাকা মাসিক (৮০+ বছর)",
        "description_en": "National old age pension Rs. 1000/month (80+)",
        "eligibility": {"age_min": 80, "income_status": "bpl"},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 28,
        "name_bn": "ইন্দিরা গান্ধী বিধবা পেনশন",
        "name_en": "IGNWPS",
        "category": "জাতীয়",
        "description_bn": "জাতীয় বিধবা পেনশন ৬০০ টাকা মাসিক",
        "description_en": "National widow pension Rs. 600/month",
        "eligibility": {"age_min": 40, "age_max": 79, "gender": "female", "income_status": "bpl"},
        "benefits": {"amount": 600, "frequency": "মাসিক"}
    },
    {
        "id": 29,
        "name_bn": "ইন্দিরা গান্ধী প্রতিবন্ধী পেনশন",
        "name_en": "IGNDPS",
        "category": "জাতীয়",
        "description_bn": "জাতীয় প্রতিবন্ধী পেনশন ৬০০ টাকা মাসিক",
        "description_en": "National disability pension Rs. 600/month",
        "eligibility": {"age_min": 18, "age_max": 79, "disability": True, "income_status": "bpl"},
        "benefits": {"amount": 600, "frequency": "মাসিক"}
    },
    {
        "id": 30,
        "name_bn": "জাতীয় পরিবার সুবিধা স্কিম",
        "name_en": "NFBS",
        "category": "জাতীয়",
        "description_bn": "রোজগেরকারীর মৃত্যুজনিত ৪০,০০০ টাকা সুবিধা",
        "description_en": "Family benefit scheme Rs. 40,000",
        "eligibility": {"income_status": "bpl"},
        "benefits": {"amount": 40000, "frequency": "এককালীন"}
    },
    
    # BUSINESS & ENTREPRENEURSHIP
    {
        "id": 31,
        "name_bn": "ব্যবসায়িক ঋণ কার্ড",
        "name_en": "Business Credit Card",
        "category": "ব্যবসা",
        "description_bn": "নতুন ব্যবসার জন্য ৫,০০,০০০ টাকা পর্যন্ত ঋণ",
        "description_en": "Loan for new businesses up to 5 lakhs",
        "eligibility": {"age_min": 18, "age_max": 65},
        "benefits": {"amount": 500000, "frequency": "এককালীন"}
    },
    {
        "id": 32,
        "name_bn": "যুবশ্রী",
        "name_en": "Yuvasree",
        "category": "ব্যবসা",
        "description_bn": "যুবকদের ব্যবসায়িক সহায়তা - ৩,০০,০০০ টাকা",
        "description_en": "Business support for youth Rs. 3 lakhs",
        "eligibility": {"age_min": 18, "age_max": 40},
        "benefits": {"amount": 300000, "frequency": "এককালীন"}
    },
    
    # SOCIAL SECURITY
    {
        "id": 33,
        "name_bn": "বিনা মূল্যে সামাজিক সুরক্ষা",
        "name_en": "Bina Mulye Samajik Suraksha",
        "category": "সামাজিক সুরক্ষা",
        "description_bn": "অসংগঠিত শ্রমিকদের জন্য বিনামূল্যে সামাজিক সুরক্ষা",
        "description_en": "Free social security for unorganized workers",
        "eligibility": {"occupation": "unorganized_worker"},
        "benefits": {"amount": 0, "frequency": "বিনামূল্যে"}
    },
    {
        "id": 34,
        "name_bn": "আনন্দধারা",
        "name_en": "Anandadhara",
        "category": "সামাজিক সুরক্ষা",
        "description_bn": "গ্রামীণ কর্মসংস্থান মিশন - ১০,০০০ টাকা বার্ষিক",
        "description_en": "Rural livelihoods mission Rs. 10,000/year",
        "eligibility": {"income_max": 200000},
        "benefits": {"amount": 10000, "frequency": "বার্ষিক"}
    },
    
    # ADDITIONAL SCHEMES
    {
        "id": 35,
        "name_bn": "তৃতীয় লিঙ্গ কল্যাণ",
        "name_en": "Third Gender Welfare",
        "category": "সামাজিক সুরক্ষা",
        "description_bn": "তৃতীয় লিঙ্গের জন্য সামাজিক সুরক্ষা - ২,০০০ টাকা বার্ষিক",
        "description_en": "Welfare scheme for third gender",
        "eligibility": {"gender": "other"},
        "benefits": {"amount": 2000, "frequency": "বার্ষিক"}
    },
    {
        "id": 36,
        "name_bn": "আমার পরিবার আমার সমাধান",
        "name_en": "Amader Para Amader Samadhan",
        "category": "সামাজিক সুরক্ষা",
        "description_bn": "স্থানীয় সমস্যা সমাধান প্রকল্প",
        "description_en": "Local problem solving scheme",
        "eligibility": {"income_max": 200000},
        "benefits": {"amount": 0, "frequency": "প্রয়োজন অনুযায়ী"}
    },
    {
        "id": 37,
        "name_bn": "সংখ্যালঘু ছাত্র বৃত্তি",
        "name_en": "Minority Student Scholarship",
        "category": "শিক্ষা",
        "description_bn": "সংখ্যালঘু সম্প্রদায়ের ছাত্রদের ২,০০০ টাকা বার্ষিক",
        "description_en": "Scholarship for minority students",
        "eligibility": {"age_min": 10, "religion": ["muslim", "christian", "sikh", "buddhist"]},
        "benefits": {"amount": 2000, "frequency": "বার্ষিক"}
    },
    {
        "id": 38,
        "name_bn": "পুরোহিত কল্যাণ স্কিম",
        "name_en": "Purohit Welfare Scheme",
        "category": "পেনশন",
        "description_bn": "পুরোহিতদের জন্য ১,০০০ টাকা মাসিক",
        "description_en": "Welfare scheme for priests",
        "eligibility": {"occupation": "purohit"},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 39,
        "name_bn": "বুনকর পেনশন",
        "name_en": "Weaver Pension",
        "category": "পেনশন",
        "description_bn": "নিবন্ধিত বুনকরদের ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension scheme for weavers",
        "eligibility": {"age_min": 60, "occupation": "weaver"},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    },
    {
        "id": 40,
        "name_bn": "বস্ত্র পেনশন",
        "name_en": "Textile Pension",
        "category": "পেনশন",
        "description_bn": "বস্ত্র শিল্প কর্মীদের ১,০০০ টাকা মাসিক পেনশন",
        "description_en": "Pension for textile workers",
        "eligibility": {"age_min": 60, "occupation": "textile_worker"},
        "benefits": {"amount": 1000, "frequency": "মাসিক"}
    }
]


def check_eligibility(citizen_data):
    """
    চেক করুন কোন প্রকল্পার জন্য যোগ্য
    """
    eligible = []
    
    for scheme in SCHEMES_DATABASE:
        eligibility_rules = scheme.get("eligibility", {})
        is_eligible = True
        
        # বয়স চেক
        if "age_min" in eligibility_rules:
            if citizen_data.get("age", 0) < eligibility_rules["age_min"]:
                is_eligible = False
        
        if "age_max" in eligibility_rules:
            if citizen_data.get("age", 0) > eligibility_rules["age_max"]:
                is_eligible = False
        
        # লিঙ্গ চেক
        if "gender" in eligibility_rules:
            if citizen_data.get("gender") != eligibility_rules["gender"]:
                is_eligible = False
        
        # জাতি চেক
        if "caste" in eligibility_rules:
            allowed_castes = eligibility_rules["caste"]
            if citizen_data.get("caste") not in allowed_castes:
                is_eligible = False
        
        # আয় চেক
        if "income_max" in eligibility_rules:
            if citizen_data.get("income_annual", 0) > eligibility_rules["income_max"]:
                is_eligible = False
        
        if is_eligible:
            eligible.append({
                "prikalpa_id": scheme["id"],
                "prikalpa_nama_bengali": scheme["name_bn"],
                "prikalpa_nama_english": scheme["name_en"],
                "category": scheme["category"],
                "description": scheme["description_bn"],
                "labh_taka": scheme["benefits"]["amount"],
                "labh_frequency": scheme["benefits"]["frequency"],
                "labh_description": f"{scheme['benefits']['amount']} টাকা {scheme['benefits']['frequency']}"
            })
    
    return eligible


async def main():
    """মূল অভিনেতা এন্ট্রি পয়েন্ট"""
    async with Actor:
        try:
            # Apify থেকে ইনপুট পান
            actor_input = await Actor.get_input()
            
            # ডিফল্ট সেট করুন যদি কোনো ইনপুট না থাকে
            if not actor_input:
                actor_input = {
                    "age": 75,
                    "gender": "female",
                    "income_annual": 2500,
                    "occupation": "unemployed",
                    "caste": "general",
                    "district": "Dakshin Dinajpur"
                }
            
            # প্রয়োজনীয় ফিল্ড যাচাই করুন
            required_fields = ["age", "gender", "income_annual", "caste", "district"]
            missing_fields = [f for f in required_fields if f not in actor_input]
            
            if missing_fields:
                error_output = {
                    "status": "error",
                    "message_bn": f"অনুপস্থিত বাধ্যতামূলক ক্ষেত্র: {', '.join(missing_fields)}",
                    "prikalpa_list": []
                }
                await Actor.push_data(error_output)
                return
            
            # যোগ্যতা চেক করুন
            eligible_schemes = check_eligibility(actor_input)
            
            # আউটপুট প্রস্তুত করুন
            output = {
                "status": "success",
                "message_bn": "সফলভাবে সম্পূর্ণ হয়েছে",
                "nagerik_profile": {
                    "boyos": actor_input.get("age"),
                    "gender": "মহিলা" if actor_input.get("gender") == "female" else "পুরুষ" if actor_input.get("gender") == "male" else "অন্যান্য",
                    "barshik_aay": f"₹ {actor_input.get('income_annual'):,}",
                    "brishti": actor_input.get("occupation", "অজানা"),
                    "jati": actor_input.get("caste", "অজানা"),
                    "jela": actor_input.get("district", "অজানা")
                },
                "yogyo_prikalpa_songkha": len(eligible_schemes),
                "yogyo_prikalpa": eligible_schemes,
                "total_prikalpa": len(SCHEMES_DATABASE),
                "message_detail_bn": f"আপনি {len(eligible_schemes)}টি প্রকল্পের জন্য যোগ্য। বিস্তারিত তথ্য নীচে দেখুন।",
                "timestamp": "2025-12-31"
            }
            
            # Apify স্টোরেজে পুশ করুন
            await Actor.push_data(output)
            
            # সাফল্য লগ করুন
            Actor.log.info(f"✅ সফল! {len(eligible_schemes)}টি যোগ্য প্রকল্প পাওয়া গেছে")
            
        except Exception as e:
            # ত্রুটি লগ করুন
            Actor.log.error(f"❌ ত্রুটি: {str(e)}")
            error_output = {
                "status": "error",
                "message_bn": f"ত্রুটি: {str(e)}",
                "prikalpa_list": []
            }
            await Actor.push_data(error_output)


if __name__ == "__main__":
    asyncio.run(main())
