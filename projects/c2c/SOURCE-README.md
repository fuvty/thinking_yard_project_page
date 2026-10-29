# Cache-to-Cache (C2C) Project Page

This is the repository that contains source code for the Cache-to-Cache: Direct Semantic Communication Between Large Language Models project page.

## Overview

Cache-to-Cache (C2C) is a novel paradigm for direct semantic communication between Large Language Models through KV cache projection, achieving better performance and efficiency compared to traditional text-based communication.

## Project Structure

```
project_page/
├── index.html              # Main project page
├── static/
│   ├── css/               # Stylesheets
│   ├── js/                # JavaScript files
│   ├── data/
│   │   └── performance.csv # Performance comparison data
│   ├── images/            # Figures from the paper
│   │   ├── scheme.png     # T2T vs C2C comparison
│   │   ├── idea.png       # Conceptual example
│   │   ├── model_arch.png # C2C architecture
│   │   ├── proj_oracle.png # Cache transformation oracle
│   │   └── gate_oracle.png # Cache enrichment oracle
│   └── videos/            # (Empty - for future demo videos)
└── README.md              # This file
```

## Features

- Interactive performance comparison table
- Dynamic summary statistics based on filtered results
- Filter by Receiver model, Sharer model, and benchmark
- Displays accuracy and inference time metrics
- Visualizations of key concepts and experimental results

## Usage

Simply open `index.html` in a web browser to view the project page.

## License

<a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/"><img alt="Creative Commons License" style="border-width:0" src="https://i.creativecommons.org/l/by-sa/4.0/88x31.png" /></a><br />This work is licensed under a <a rel="license" href="http://creativecommons.org/licenses/by-sa/4.0/">Creative Commons Attribution-ShareAlike 4.0 International License</a>.

## Acknowledgments

Website template borrowed from [Nerfies](https://nerfies.github.io).
