import requests
from bs4 import BeautifulSoup
import os

# Create directories for each category
categories = [
    "spells", "classes", "items", "feats", "racial-feats", "backgrounds", 
    "monsters", "equipment", "abilities", "skills", "conditions"
]

print("🚀 Starting D&D 5e Wiki Data Extraction...")
print("📁 Creating category folders...")

for category in categories:
    os.makedirs(f"{category}_data", exist_ok=True)
    print(f"📁 Created folder: {category}_data")

print("\n📚 Now extracting content from each category...")

# Base URL
base_url = "https://dnd5e.wikidot.com/"

# Process each category
for category in categories:
    url = f"{base_url}{category}"
    print(f"\n🔍 Processing category: {category}")
    response = requests.get(url)
    soup = BeautifulSoup(response.content, "html.parser")
    
    # Find all article links for this category
    articles = soup.find_all("a", class_="article")
    print(f"📄 Found {len(articles)} articles in {category} category")
    
    for index, article in enumerate(articles):
        article_url = base_url + article["href"]
        print(f"\n📥 Processing article {index+1}/{len(articles)}: {article_url}")
        article_response = requests.get(article_url)
        article_soup = BeautifulSoup(article_response.content, "html.parser")
        
        # Extract title
        title = article_soup.find("h1", class_="page-title").text.strip()
        
        # Extract content
        content = article_soup.find("div", class_="page-content")
        if content:
            content_text = content.get_text(separator="\n", strip=True)
        else:
            content_text = ""
        
        # Save to file
        file_path = f"{category}_data/{title}.txt"
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(f"Title: {title}\n\n{content_text}")
        print(f"💾 Saved: {file_path}")
