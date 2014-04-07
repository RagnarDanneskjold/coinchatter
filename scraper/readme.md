#Coinsecrets.org Python Scraper

This Python script scrapes every transaction ID from CoinSecrets.org and creates a list of them.  The purpose of this is to compile a large list of OP_RETURN containing transactions, to give the site some content.

The scraper does not directly go to the website, instead it takes an HTML file.  Since CoinSecrets.org displays more content on scrolling to the bottom (and this handled by JS), this screws up the scraper.  Thus, to properly scrape the site, you must go to it on your browser of choice, then repeatedly scroll down until all the entries are loaded.  After that, save the HTML file.  Pass *that* file into the scraper.

##Dependencies

*BeautifulSoup4

Dependencies can be installed via pip.  Alternatively there is a requirements.txt file.