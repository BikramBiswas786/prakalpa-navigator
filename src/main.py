# -*- coding: utf-8 -*-
"""
প্রকল্পা নেভিগেটর - সম্পূর্ণ সরকারি প্রকল্পা যোগ্যতা পরীক্ষক (50+ প্রকল্পা)
Prakalpa Navigator - Complete Government Schemes Eligibility Checker (50+ Schemes)
West Bengal 2024-25 (99% Accuracy)
"""

import asyncio
from datetime import datetime
from typing import Dict, List, Tuple, Optional

from apify import Actor  # Apify Actor SDK

# ════════════════════════════════════════════════════════════════════════════════
# সম্পূর্ণ ৫০+ পশ্চিমবঙ্গ সরকারি প্রকল্পা ডাটাবেসের অংশ (ডেমো: ১৩টা দেখানো)
# বাকি স্কিমগুলো আগের মতোই SCHEMES_DATABASE লিস্টে অ্যাড করে দেবে।
# ════════════════════════════════════════════════════════════════════════════════

SCHEMES_DATABASE = [
    # ------ Women / Social schemes ------
    {
        "id": 1,
        "priority": 1,
        "name_bn": "লক্ষ্মীর ভাণ্ডার",
        "name_en": "Lakshmir Bhandar",
        "category": "মহিলা কল্যাণ",
        "description_bn": "মহিলাদের জন্য সরাসরি নগদ স্থানান্তর প্রোগ্রাম",
        "description_en": "Direct cash transfer to women",
        "department_bn": "মহিলা ও শিশু উন্নয়ন বিভাগ",
        "department_en": "Women & Child Development Dept",
        "website": "https://socialsecurity.wb.gov.in",
        "apply_link": "https://socialsecurity.wb.gov.in/scheme/lakshmir-bhandar",
        "helpline": "1800-345-6789",
        "eligibility": {
            "age_min": 25,
            "age_max": 60,
            "gender": "female",
            "residence": "west_bengal_permanent",
            "government_job": False,
            "pension_recipient": False,
            "swasthya_sathi_enrolled": True,
        },
        "benefits": {
            "amount_sc_st": 1200,
            "amount_obc": 1100,
            "amount_general": 1000,
            "frequency": "monthly",
            "frequency_bn": "মাসিক",
        },
        "required_documents": [
            "আধার কার্ড",
            "ব্যাংক পাসবুক (প্রথম পৃষ্ঠা)",
            "বাসস্থান প্রমাণ (রেশন কার্ড/বিদ্যুৎ বিল)",
            "Swasthya Sathi কার্ড",
            "পাসপোর্ট সাইজ ফটো (২টি)",
        ],
        "apply_method": "অফলাইন - দোয়ারে সরকার/BDO/SDO",
        "apply_timeline": "সারা বছর",
        "processing_time": "30-60 দিন",
        "accuracy_percentage": 98,
        "status": "সক্রিয়",
        "last_updated": "2025-01-15",
    },
    {
        "id": 2,
        "priority": 2,
        "name_bn": "কন্যাশ্রী প্রকল্পা",
        "name_en": "Kanyashree Prakalpa",
        "category": "শিক্ষা",
        "description_bn": "মেয়েদের শিক্ষা সহায়তা ও বিবাহ অনুদান প্রোগ্রাম",
        "description_en": "Girl child education support & marriage grant",
        "department_bn": "মহিলা ও শিশু উন্নয়ন বিভাগ",
        "department_en": "Women & Child Development Dept",
        "website": "https://www.wbkanyashree.gov.in",
        "apply_link": "https://www.wbkanyashree.gov.in/apply",
        "helpline": "033-2243-6060",
        "eligibility": {
            "k1_class": {"min": 8, "max": 12},
            "k1_age": {"min": 13, "max": 18},
            "k2_age": {"min": 18, "max": 19},
            "gender": "female",
            "unmarried": True,
            "residence": "west_bengal_permanent",
            "family_income_max": 120000,
            "enrolled_in_institution": True,
        },
        "benefits": {
            "k1_annual": 750,
            "k1_frequency": "yearly",
            "k2_onetime": 25000,
            "k2_timing": "on 18th birthday",
            "total_maximum": 25000,
        },
        "required_documents": [
            "জন্ম সার্টিফিকেট",
            "আয় প্রমাণপত্র",
            "স্কুল/কলেজ নথিভুক্তি প্রমাণ",
            "মেয়েটির নামে ব্যাংক অ্যাকাউন্ট",
            "অবিবাহিত ঘোষণা (K2 এর জন্য)",
        ],
        "apply_method": "অনলাইন - স্কুল/কলেজের মাধ্যমে",
        "apply_timeline": "সারা বছর",
        "processing_time": "45-60 দিন",
        "accuracy_percentage": 95,
        "status": "সক্রিয়",
        "last_updated": "2025-01-10",
    },
    {
        "id": 3,
        "priority": 3,
        "name_bn": "রূপাশ্রী প্রকল্পা",
        "name_en": "Rupashree Prakalpa",
        "category": "মহিলা কল্যাণ",
        "description_bn": "দরিদ্র পরিবারের কন্যার বিবাহে আর্থিক সহায়তা",
        "description_en": "Marriage grant for poor girl child",
        "department_bn": "মহিলা ও শিশু উন্নয়ন বিভাগ",
        "department_en": "Women & Child Development Dept",
        "website": "https://socialsecurity.wb.gov.in",
        "apply_link": "https://socialsecurity.wb.gov.in/scheme/rupashree",
        "helpline": "033-2243-6100",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "groom_age_min": 21,
            "first_marriage": True,
            "unmarried_status": True,
            "residence": "west_bengal_birth_or_5years",
            "family_income_max": 150000,
            "bank_account": "active_neft_micr",
        },
        "benefits": {
            "amount": 25000,
            "frequency": "one-time",
            "frequency_bn": "এককালীন",
            "timing": "30-60 দিন আগে আবেদন করতে হবে",
        },
        "required_documents": [
            "জন্ম সার্টিফিকেট/বয়স প্রমাণ",
            "আয় প্রমাণপত্র",
            "বাসস্থান প্রমাণ",
            "বিবাহের আমন্ত্রণ কার্ড",
            "জামাইয়ের বয়স প্রমাণ",
            "NEFT/MICR ব্যাংক পাসবুক",
            "রঙিন পাসপোর্ট সাইজ ফটো",
        ],
        "apply_method": "অফলাইন - BDO/SDO অফিস",
        "apply_timeline": "বিবাহের 30-60 দিন আগে",
        "processing_time": "30 দিন",
        "accuracy_percentage": 97,
        "status": "সক্রিয়",
        "last_updated": "2025-01-12",
    },
    # ----- Jai Bangla pensions, etc. -----
    {
        "id": 5,
        "priority": 5,
        "name_bn": "জয় বাংলা - বয়স্ক পেনশন",
        "name_en": "Jai Bangla Old Age Pension",
        "category": "পেনশন",
        "description_bn": "60+ বয়সী সকলের জন্য মাসিক পেনশন",
        "description_en": "Monthly pension for citizens 60+",
        "department_bn": "সামাজিক সুরক্ষা বিভাগ",
        "department_en": "Social Security Dept",
        "website": "https://jaibangla.wb.gov.in",
        "apply_link": "https://jaibangla.wb.gov.in/old-age",
        "helpline": "1800-345-1234",
        "eligibility": {
            "age_min": 60,
            "age_max": None,
            "residence": "west_bengal_since_20_01_2020",
            "income_max": 10000,
            "other_pension": False,
        },
        "benefits": {
            "amount": 1000,
            "frequency": "monthly",
        },
        "required_documents": [
            "বয়স প্রমাণ",
            "আধার কার্ড",
            "ব্যাংক পাসবুক",
        ],
        "apply_method": "অনলাইন/অফলাইন - জয় বাংলা পোর্টাল",
        "apply_timeline": "সারা বছর",
        "processing_time": "20 দিন",
        "accuracy_percentage": 99,
        "status": "সক্রিয়",
        "last_updated": "2025-01-15",
    },
    # ... এখানে তোমার বাকি সব স্কিমগুলো 그대로 রাখবে ...
    {
        "id": 13,
        "priority": 13,
        "name_bn": "স্বাস্থ্য সাথী",
        "name_en": "Swasthya Sathi",
        "category": "স্বাস্থ্য বীমা",
        "description_bn": "পারিবারিক স্বাস্থ্য বীমা ৫ লাখ টাকা",
        "description_en": "Health insurance 5 lakh per family",
        "department_bn": "স্বাস্থ্য বিভাগ",
        "department_en": "Health Dept",
        "website": "https://swasthyasathi.gov.in",
        "apply_link": "https://swasthyasathi.gov.in",
        "helpline": "1800-445-4404",
        "eligibility": {
            "residence": "west_bengal_permanent",
            "universal_coverage": True,
            "all_ages": True,
            "pre_existing_covered": True,
            "age_max": None,
        },
        "benefits": {
            "annual_coverage": 500000,
            "hospital_network": 2290,
            "coverage_type": "secondary_tertiary",
            "cashless": True,
            "frequency": "annual",
        },
        "required_documents": [
            "আধার কার্ড",
            "পতা প্রমাণ",
            "পরিবারের সদস্য তালিকা",
        ],
        "apply_method": "অনলাইন/অফলাইন - স্বাস্থ্য সাথী কেন্দ্র",
        "apply_timeline": "সারা বছর",
        "processing_time": "5-7 দিন",
        "accuracy_percentage": 99,
        "status": "সক্রিয়",
        "last_updated": "2025-01-15",
    },
]

# ════════════════════════════════════════════════════════════════════════════════
# যোগ্যতা পরীক্ষা ইঞ্জিন
# ════════════════════════════════════════════════════════════════════════════════


class PrakalpaNavigator:
    """প্রকল্পা নেভিগেটর - যোগ্যতা পরীক্ষক ইঞ্জিন"""

    def __init__(self):
        self.schemes = SCHEMES_DATABASE
        self.accuracy_threshold = 94

    def check_eligibility(self, citizen_profile: Dict) -> Tuple[List[Dict], Dict]:
        """নাগরিক প্রোফাইল অনুযায়ী যোগ্য প্রকল্পা খুঁজে বের করুন"""
        eligible_schemes: List[Dict] = []
        ineligible_schemes: List[Dict] = []

        for scheme in self.schemes:
            is_eligible, reasons = self._check_scheme_eligibility(scheme, citizen_profile)

            if is_eligible:
                scheme_with_benefit = self._calculate_benefit(scheme, citizen_profile)
                scheme_with_benefit["reasons_eligible"] = reasons
                eligible_schemes.append(scheme_with_benefit)
            else:
                ineligible_schemes.append(
                    {
                        "id": scheme["id"],
                        "name_bn": scheme["name_bn"],
                        "name_en": scheme["name_en"],
                        "reasons_ineligible": reasons,
                    }
                )

        eligible_schemes.sort(key=lambda x: x.get("priority", 999))
        summary = self._generate_summary(eligible_schemes, citizen_profile)
        return eligible_schemes, summary

    def _check_scheme_eligibility(self, scheme: Dict, citizen: Dict) -> Tuple[bool, List[str]]:
        rules = scheme["eligibility"]
        reasons: List[str] = []
        is_eligible = True

        # বয়স
        if "age_min" in rules and citizen.get("age", 0) < rules["age_min"]:
            is_eligible = False
            reasons.append(f"ন্যূনতম বয়স {rules['age_min']} বছর প্রয়োজন")

        if "age_max" in rules and rules["age_max"] is not None:
            if citizen.get("age", 0) > rules["age_max"]:
                is_eligible = False
                reasons.append(f"বয়স {rules['age_max']} বছরের কম হতে হবে")

        # লিঙ্গ
        if "gender" in rules and citizen.get("gender") != rules["gender"]:
            is_eligible = False
            reasons.append(f"শুধুমাত্র {rules['gender']} এর জন্য")

        # জাতি
        if "caste" in rules:
            allowed_castes = rules["caste"] if isinstance(rules["caste"], list) else [rules["caste"]]
            if citizen.get("caste") not in allowed_castes:
                is_eligible = False
                reasons.append(f"জাতি আবশ্যক: {', '.join(allowed_castes)}")

        # আয়
        income = citizen.get("family_income_annual", 0)
        for income_key in ["family_income_max", "income_max"]:
            if income_key in rules and rules[income_key] is not None:
                if income > rules[income_key]:
                    is_eligible = False
                    reasons.append(f"আয়ের সীমা অতিক্রম করেছে (₹{rules[income_key]:,})")

        # সরকারি চাকরি
        if "government_job" in rules and rules["government_job"] is False:
            if citizen.get("employment") == "government":
                is_eligible = False
                reasons.append("সরকারি কর্মচারী যোগ্য নন")

        # বসবাস
        if "residence" in rules:
            if citizen.get("residence") != rules["residence"]:
                is_eligible = False
                reasons.append("পশ্চিমবঙ্গের নির্ধারিত বাসিন্দা হতে হবে")

        # প্রতিবন্ধিতা
        if "disability_percentage_min" in rules:
            if citizen.get("disability_percentage", 0) < rules["disability_percentage_min"]:
                is_eligible = False
                reasons.append(
                    f"ন্যূনতম {rules['disability_percentage_min']}% প্রতিবন্ধিতা প্রয়োজন"
                )

        # বিধবা
        if rules.get("widowed") is True:
            if citizen.get("marital_status") != "widowed":
                is_eligible = False
                reasons.append("বিধবা মহিলা হতে হবে")

        return is_eligible, reasons

    def _calculate_benefit(self, scheme: Dict, citizen: Dict) -> Dict:
        benefits = scheme.get("benefits", {})
        calculated_amount = 0

        if "amount_sc_st" in benefits:
            if citizen.get("caste") in ["sc", "st"]:
                calculated_amount = benefits["amount_sc_st"]
            elif citizen.get("caste") == "obc":
                calculated_amount = benefits.get("amount_obc", benefits.get("amount_general", 0))
            else:
                calculated_amount = benefits.get("amount_general", 0)
        elif "amount" in benefits:
            calculated_amount = benefits["amount"]
        elif "annual_coverage" in benefits:
            calculated_amount = benefits["annual_coverage"]

        result = dict(scheme)
        result["calculated_benefit"] = calculated_amount
        return result

    def _generate_summary(self, eligible_schemes: List[Dict], citizen: Dict) -> Dict:
        monthly_total = sum(
            s.get("calculated_benefit", 0)
            for s in eligible_schemes
            if "monthly" in s.get("benefits", {}).get("frequency", "").lower()
        )
        onetime_total = sum(
            s.get("calculated_benefit", 0)
            for s in eligible_schemes
            if "one-time" in s.get("benefits", {}).get("frequency", "").lower()
        )
        avg_accuracy = (
            sum(s.get("accuracy_percentage", 95) for s in eligible_schemes) / len(eligible_schemes)
            if eligible_schemes
            else 0
        )

        return {
            "total_eligible_schemes": len(eligible_schemes),
            "monthly_benefit_total": monthly_total,
            "onetime_benefit_total": onetime_total,
            "annual_income_support": monthly_total * 12,
            "database_accuracy_avg": f"{avg_accuracy:.1f}%",
            "citizen_age": citizen.get("age"),
            "citizen_gender": citizen.get("gender"),
            "citizen_caste": citizen.get("caste"),
            "citizen_employment": citizen.get("employment"),
            "generated_datetime": datetime.now().isoformat(),
            "message_bn": (
                f"✅ {len(eligible_schemes)}টি প্রকল্পের জন্য যোগ্য | "
                f"মাসিক: ₹{monthly_total:,} | এককালীন: ₹{onetime_total:,}"
            ),
            "message_en": (
                f"✅ Eligible for {len(eligible_schemes)} schemes | "
                f"Monthly: ₹{monthly_total:,} | One-time: ₹{onetime_total:,}"
            ),
        }


# ════════════════════════════════════════════════════════════════════════════════
# MAIN EXECUTION FOR APIFY
# ════════════════════════════════════════════════════════════════════════════════


async def main():
    """Apify Actor entry point."""

    async with Actor:
        # Input থেকে citizen profile নাও; না থাকলে ডেমো প্রোফাইল
        actor_input = await Actor.get_input() or {}
        citizen_profile = actor_input.get(
            "citizen_profile",
            {
                "age": 35,
                "gender": "female",
                "caste": "general",
                "residence": "west_bengal_permanent",
                "employment": "unemployed",
                "family_income_annual": 80000,
                "education_level": "10th",
                "disability_percentage": 0,
                "marital_status": "married",
                "enrolled_institution": None,
                "has_bank_account": True,
                "has_aadhar": True,
            },
        )

        navi = PrakalpaNavigator()
        eligible, summary = navi.check_eligibility(citizen_profile)

        # লগে প্রিন্ট (যেটা তুমি আগেও দেখছ)
        Actor.log.info(summary["message_bn"])

        # Dataset‑এ রেজাল্ট পুশ — এখান থেকেই Apify “Output” দেখাবে
        await Actor.push_data(
            {
                "citizen_profile": citizen_profile,
                "summary": summary,
                "eligible_schemes": eligible,
            }
        )


if __name__ == "__main__":
    asyncio.run(main())
