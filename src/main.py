import asyncio
from apify import Actor
import requests
from urllib.parse import urljoin

async def main() -> None:
    async with Actor:
        actor_input = await Actor.get_input() or {}
        Actor.log.info(f"Actor input: {actor_input}")

        # Extract input parameters
        search_query = actor_input.get("search_query", "")
        age = actor_input.get("age")
        gender = actor_input.get("gender")
        income_annual = actor_input.get("income_annual")
        occupation = actor_input.get("occupation")
        caste = actor_input.get("caste")
        district = actor_input.get("district")

        Actor.log.info(f"Searching for schemes with query: {search_query}")
        Actor.log.info(f"Filters - Age: {age}, Gender: {gender}, Income: {income_annual}, Occupation: {occupation}, Caste: {caste}, District: {district}")

        results = []

        # TODO: Add actual Prakalpa Navigator scraping logic here
        # Example structure:
        # 1. Fetch government schemes list
        # 2. Filter by user criteria
        # 3. Parse and extract scheme details
        # 4. Push to dataset

        # Placeholder result
        result = {
            "status": "success",
            "message": "Prakalpa Navigator Python actor is running",
            "input_parameters": {
                "search_query": search_query,
                "age": age,
                "gender": gender,
                "income_annual": income_annual,
                "occupation": occupation,
                "caste": caste,
                "district": district,
            },
            "results_count": len(results),
            "results": results,
        }

        # Store in KV store
        await Actor.set_value("OUTPUT", result)
        Actor.log.info(f"Result stored in Key-Value store. Found {len(results)} schemes")

        # Also push to dataset
        await Actor.push_data(result)
        Actor.log.info("Result pushed to dataset")
