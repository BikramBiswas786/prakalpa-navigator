from apify import Actor

SCHEMES_DATABASE = [
    {"id":1,"name_bn":"লক্ষ্মীর ভাণ্ডার","category":"women","eligibility":{"age_min":25,"age_max":60,"gender":"female"},"benefits":{"amount":1000,"description_bn":"মাসিক ₹১০০০"},"official_link":"socialsecurity.wb.gov.in"},
    {"id":2,"name_bn":"কন্যাশ্রী প্রকল্প","category":"girl_child","eligibility":{"age_min":13,"age_max":18,"gender":"female"},"benefits":{"amount":2500,"description_bn":"বার্ষিক বৃত্তি"},"official_link":"wbkanyashree.gov.in"},
    {"id":3,"name_bn":"কৃষক বন্ধু","category":"farmer","eligibility":{"occupation":"farmer"},"benefits":{"amount":10000,"description_bn":"প্রতি ঋতু ₹১০,০০০"},"official_link":"krishakbandhu.net"},
    {"id":4,"name_bn":"স্বাস্থ্য সাথী","category":"health","eligibility":{"income_max":300000},"benefits":{"amount":500000,"description_bn":"বার্ষিক ₹৫ লক্ষ"},"official_link":"ds.wb.gov.in"},
    {"id":5,"name_bn":"রূপাশ্রী প্রকল্প","category":"women","eligibility":{"gender":"female","age_min":18},"benefits":{"amount":25000,"description_bn":"বিবাহ অনুদান"},"official_link":"socialsecurity.wb.gov.in"}
    # Add all 46 schemes from [code_file:107]
]

async def main():
    async with Actor:
        input = await Actor.get_input() or {}
        eligible = []
        for scheme in SCHEMES_DATABASE:
            if all(input.get(k) == v for k,v in scheme["eligibility"].items() if k in input):
                eligible.append(scheme)
        await Actor.push_data({"eligible_schemes": eligible, "count": len(eligible)})

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
