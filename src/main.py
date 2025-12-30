# -*- coding: utf-8 -*-
"""
Prakalpa Navigator - Government Scheme Eligibility Checker
For West Bengal, India
"""
import json
import sys
from apify import Actor

# Database of 8 government schemes
SCHEMES_DATABASE = [
    {
        "id": 1,
        "name_bn": "लक्ष्मीर भंडार",
        "name_en": "Lakshmir Bhandar",
        "category": "women",
        "description": "Monthly allowance for women",
        "eligibility": {
            "age_min": 25,
            "age_max": 60,
            "gender": "female",
            "caste": ["sc", "st", "obc"],
            "income_max": 300000
        },
        "benefits": {
            "amount": 1000,
            "frequency": "monthly"
        }
    },
    {
        "id": 2,
        "name_bn": "कन्याश्री प्रकल्प",
        "name_en": "Kanyashree Prakalpa",
        "category": "girl_child",
        "description": "Scholarship for girl children",
        "eligibility": {
            "age_min": 13,
            "age_max": 18,
            "gender": "female",
            "income_max": 120000
        },
        "benefits": {
            "amount": 2500,
            "frequency": "annual"
        }
    },
    {
        "id": 3,
        "name_bn": "रूपाश्री प्रकल्प",
        "name_en": "Rupashree Prakalpa",
        "category": "women",
        "description": "Marriage grant for women",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "age_max": 60,
            "caste": ["sc", "st", "obc"],
            "income_max": 300000
        },
        "benefits": {
            "amount": 25000,
            "frequency": "one_time"
        }
    },
    {
        "id": 4,
        "name_bn": "शिशु साथी",
        "name_en": "Sishu Sathi",
        "category": "child",
        "description": "Child support program",
        "eligibility": {
            "age_min": 0,
            "age_max": 6,
            "income_max": 200000
        },
        "benefits": {
            "amount": 600,
            "frequency": "monthly"
        }
    },
    {
        "id": 5,
        "name_bn": "सबला प्रकल्प",
        "name_en": "Sabla Prakalpa",
        "category": "girl_child",
        "description": "Adolescent girl scheme",
        "eligibility": {
            "age_min": 13,
            "age_max": 18,
            "gender": "female"
        },
        "benefits": {
            "amount": 2500,
            "frequency": "annual"
        }
    },
    {
        "id": 6,
        "name_bn": "मातृयान",
        "name_en": "Matrivan",
        "category": "maternal_health",
        "description": "Free transport for pregnant women",
        "eligibility": {
            "gender": "female",
            "age_min": 18,
            "age_max": 50
        },
        "benefits": {
            "amount": 0,
            "frequency": "as_needed"
        }
    },
    {
        "id": 7,
        "name_bn": "जागो",
        "name_en": "Jago Prakalpa",
        "category": "women",
        "description": "Women self-help group support",
        "eligibility": {
            "gender": "female",
            "age_min": 25,
            "age_max": 60
        },
        "benefits": {
            "amount": 5000,
            "frequency": "annual"
        }
    },
    {
        "id": 8,
        "name_bn": "निज गृह निज भूमि",
        "name_en": "Nij Griha Nij Bhoomi",
        "category": "housing",
        "description": "Land ownership assistance",
        "eligibility": {
            "income_max": 300000
        },
        "benefits": {
            "amount": 250000,
            "frequency": "one_time"
        }
    }
]


def check_eligibility(citizen_data):
    """
    Check which schemes the citizen is eligible for
    Returns: List of eligible schemes
    """
    eligible = []
    
    for scheme in SCHEMES_DATABASE:
        eligibility_rules = scheme.get("eligibility", {})
        is_eligible = True
        
        # Age check
        if "age_min" in eligibility_rules:
            if citizen_data.get("age", 0) < eligibility_rules["age_min"]:
                is_eligible = False
        
        if "age_max" in eligibility_rules:
            if citizen_data.get("age", 0) > eligibility_rules["age_max"]:
                is_eligible = False
        
        # Gender check
        if "gender" in eligibility_rules:
            if citizen_data.get("gender") != eligibility_rules["gender"]:
                is_eligible = False
        
        # Caste check
        if "caste" in eligibility_rules:
            allowed_castes = eligibility_rules["caste"]
            if citizen_data.get("caste") not in allowed_castes:
                is_eligible = False
        
        # Income check
        if "income_max" in eligibility_rules:
            if citizen_data.get("income_annual", 0) > eligibility_rules["income_max"]:
                is_eligible = False
        
        if is_eligible:
            eligible.append({
                "scheme_id": scheme["id"],
                "scheme_name": scheme["name_en"],
                "scheme_name_bn": scheme["name_bn"],
                "category": scheme["category"],
                "description": scheme["description"],
                "benefits_amount": scheme["benefits"]["amount"],
                "benefits_frequency": scheme["benefits"]["frequency"]
            })
    
    return eligible


async def main():
    """Main actor entry point"""
    async with Actor:
        try:
            # Get input from Apify
            actor_input = await Actor.get_input()
            
            # Use default if no input
            if not actor_input:
                actor_input = {
                    "age": 35,
                    "gender": "female",
                    "income_annual": 0,
                    "occupation": "unemployed",
                    "caste": "sc",
                    "district": "Kolkata"
                }
            
            # Validate required fields
            required_fields = ["age", "gender", "income_annual", "occupation", "caste", "district"]
            missing_fields = [f for f in required_fields if f not in actor_input]
            
            if missing_fields:
                error_output = {
                    "status": "error",
                    "message": f"Missing required fields: {', '.join(missing_fields)}",
                    "eligible_schemes": []
                }
                await Actor.push_data(error_output)
                return
            
            # Check eligibility
            eligible_schemes = check_eligibility(actor_input)
            
            # Prepare output
            output = {
                "status": "success",
                "citizen_profile": {
                    "age": actor_input.get("age"),
                    "gender": actor_input.get("gender"),
                    "income_annual": actor_input.get("income_annual"),
                    "occupation": actor_input.get("occupation"),
                    "caste": actor_input.get("caste"),
                    "district": actor_input.get("district")
                },
                "eligible_schemes_count": len(eligible_schemes),
                "eligible_schemes": eligible_schemes,
                "total_schemes_in_database": len(SCHEMES_DATABASE),
                "timestamp": "2025-12-31"
            }
            
            # Push to Apify storage
            await Actor.push_data(output)
            
            # Log success
            Actor.log.info(f"✅ Success! Found {len(eligible_schemes)} eligible schemes")
            
        except Exception as e:
            # Log error
            Actor.log.error(f"❌ Error: {str(e)}")
            error_output = {
                "status": "error",
                "message": str(e),
                "eligible_schemes": []
            }
            await Actor.push_data(error_output)


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
