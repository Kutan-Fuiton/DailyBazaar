import json

with open("data/corrections.json") as f:
    corrections = json.load(f)

def add_correction(wrong, correct):
    corrections.append({"input": wrong, "output": correct})
    
    with open("data/corrections.json", "w") as f:
        json.dump(corrections, f, indent=2)

if __name__ == "__main__":
    wrong = input("Wrong: ")
    correct = input("Correct: ")

    add_correction(wrong, correct)