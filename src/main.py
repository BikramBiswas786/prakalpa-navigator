# -*- coding: utf-8 -*-
import json
from apify import Actor

SCHEMES_DATABASE = [
    # ========== WOMEN & GIRL CHILD SCHEMES (8) ==========
    {
        "id": 1,
        "name_bn": "लक्ष्मीर भंडार",
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
            "description_bn": "प्रति मासे ₹१०००"
        },
        "how_to_apply_bn": "दुआरे सरकार या BDO अफिस में",
        "documents_bn": ["आधार", "बैंक पासबुक"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 2,
        "name_bn": "कन्याश्री प्रकल्प",
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
            "description_bn": "वार्षिक ₹२५००"
        },
        "how_to_apply_bn": "स्कूल के माध्यम से",
        "documents_bn": ["जन्म प्रमाणपत्र"],
        "official_link": "https://www.wbkanyashree.gov.in/"
    },
    {
        "id": 3,
        "name_bn": "रूपाश्री प्रकल्प",
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
            "description_bn": "विवाह अनुदान ₹२५,०००"
        },
        "how_to_apply_bn": "BDO अफिस में",
        "documents_bn": ["विवाह नथी"],
        "official_link": "https://socialsecurity.wb.gov.in/"
    },
    {
        "id": 4,
        "name_bn": "शिशु साथी",
        "name_en": "Sishu Sathi",
        "category": "child",
        "eligibility": {
            "age_min": 0,
            "age_max": 6,
            "income_max": 200000
        },
        "benefits": {
            "amount": 600,
            "description_bn": "मासिक ₹६००"
        },
        "how_to_apply_bn": "दुआरे सरकार में",
        "documents_bn": ["जन्म प्रमाणपत्र"],
        "official_link": "https://icds.wb.gov.in/"
    },
    {
        "id": 5,
        "name_bn": "सबला प्रकल्प",
        "name_en": "Sabla Prakalpa",
        "category": "girl_child",
        "eligibility": {
            "age_min": 13,
            "age_max": 18,
            "gender": "female"
        },
        "benefits": {
            "amount": 2500,
            "description_bn": "वार्षिक बृत्ति"
        },
        "how_to_apply_bn": "स्कूल में",
        "documents_bn": ["स्कूल आईडी"],
        "official_link": "https://icds.wb.gov.in/"
    },
    {
        "id": 6,
        "name_bn": "मातृयान",
        "name_en": "Matrivan",
        "category": "maternal_health",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "age_max": 50
        },
        "benefits": {
            "amount": 0,
            "description_bn": "गर्भवती महिलाओं के लिए मुफ्त परिवहन"
        },
        "how_to_apply_bn": "स्वास्थ्य केंद्र में",
        "documents_bn": ["मातृत्व कार्ड"],
        "official_link": "https://health.wb.gov.in/"
    },
    {
        "id": 7,
        "name_bn": "जागो",
        "name_en": "Jago Prakalpa",
        "category": "women",
        "eligibility": {
            "gender": "female",
            "age_min": 25,
            "age_max": 60
        },
        "benefits": {
            "amount": 5000,
            "description_bn": "वार्षिक ₹५०००"
        },
        "how_to_apply_bn": "SHG अफिस में",
        "documents_bn": ["SHG सदस्यपत्र"],
        "official_link": "https://wbshg.gov.in/"
    },
    {
        "id": 8,
        "name_bn": "निज गृह निज भूमि",
        "name_en": "Nij Griha Nij Bhoomi",
        "category": "housing",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 250000,
            "description_bn": "₹२.५ लक्ष भूमि सहायता"
        },
        "how_to_apply_bn": "BDO अफिस में",
        "documents_bn": ["आय प्रमाणपत्र"],
        "official_link": "https://land.wb.gov.in/"
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
        
        # ✅ FIX: Push data to Apify
        await Actor.push_data(output)
        
        Actor.log.info(f"✅ पाता: {len(eligible_schemes)} योजनाएं मिलीं")

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
