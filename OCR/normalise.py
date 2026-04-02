from rapidfuzz import process, fuzz

def map_to_item(word, items_data, threshold=80):

    word = word.lower().strip()

    if len(word) <= 2:
        return word

    if len(word.split()) == 1 and len(word) <= 3:
        return word

    # Build search space (names + aliases)
    search_list = []
    lookup = {}

    for item in items_data:
        name = item["name"]

        search_list.append(name)
        lookup[name] = name

        for alias in item["aliases"]:
            search_list.append(alias)
            lookup[alias] = name

    # Fuzzy match
    match, score, _ = process.extractOne(
        word,
        search_list,
        scorer=fuzz.token_sort_ratio
    )

    # Accept only strong matches
    if score >= threshold:
        return lookup[match]

    return word

if __name__ == "__main__":
    items_data = [
        {
            "name": "potato",
            "aliases": ["po rats", "pota to", "patato"]
        },
        {
            "name": "milk",
            "aliases": ["mlik"]
        }
    ]

    print(map_to_item("po rats", items_data))  #  potato
    print(map_to_item("po", items_data))       #  po
    print(map_to_item("patato", items_data))   #  potato