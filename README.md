# Helioheggie Project

## Project Description

Helioheggie is a web application designed to [describe the project's purpose here, e.g., provide weather information, manage energy tariffs, and offer advisory services]. It aims to [explain the project's goals and target audience, e.g., offer a user-friendly interface for accessing weather and energy-related information, help users make informed decisions about their energy consumption].

## Project Structure

The project is structured as follows:
```
helioheggie/
├── README.md                  # This file
├── components.json            # Configuration file for components
├── next-env.d.ts              # TypeScript environment file
├── next.config.ts             # Next.js configuration file
├── package-lock.json          # Dependency lock file
├── package.json               # Project dependencies and scripts
├── postcss.config.mjs         # PostCSS configuration file
├── tailwind.config.ts         # Tailwind CSS configuration file
├── tsconfig.json              # TypeScript configuration file
├── .idx/                      # Index directory
│   └── dev.nix                # Development environment configuration
├── docs/                      # Documentation files
│   └── blueprint.md           # Project blueprint
├── src/                       # Source code directory
│   ├── ai/                    # AI related code
│   │   ├── ai-instance.ts     # AI instance logic
│   │   └── dev.ts             # AI development utilities
│   ├── app/                   # Next.js application code
│   │   ├── favicon.ico        # Favicon
│   │   ├── globals.css        # Global styles
│   │   ├── layout.tsx         # Main layout component
│   │   ├── page.tsx           # Home page component
│   │   ├── advisory/          # Advisory pages
│   │   │   └── page.tsx
│   │   ├── info/              # Information pages
│   │   │   └── page.tsx
│   │   ├── settings/          # Settings pages
│   │   │   └── page.tsx
│   │   └── tariffs/           # Tariffs pages
│   │       └── page.tsx
│   ├── components/            # Reusable UI components
│   │   ├── query-provider.tsx # Query provider component
│   │   ├── theme-provider.tsx # Theme provider component
│   │   ├── theme-toggle.tsx   # Theme toggle component
│   │   ├── layout/            # Layout components
│   │   │   ├── footer.tsx     # Footer component
│   │   │   └── header.tsx     # Header component
│   │   └── ui/                # UI components
│   │       ├── accordion.tsx  # Accordion component
│   │       ├── ...            # Other UI components
│   ├── hooks/                 # Custom hooks
│   │   ├── use-local-storage.ts # Local storage hook
│   │   ├── use-mobile.tsx       # Mobile detection hook
│   │   └── use-toast.ts         # Toast hook
│   ├── services/              # External services integration
│   │   └── weather.ts         # Weather service integration
│   └── types/                 # TypeScript type definitions
│       └── settings.ts        # Settings types
└── ...
```
## Setup and Run

1.  **Clone the repository:**
```
bash
    git clone https://github.com/Hudmebac/helioheggie.git
    cd helioheggie
    
```
2.  **Install dependencies:**
```
bash
    npm install
    
```
3.  **Run the development server:**
```
bash
    npm run dev
    
```
This will start the application on `http://localhost:3000`.

## Contributing

We welcome contributions to Helioheggie! If you'd like to contribute, please follow these steps:

1.  **Fork the repository.**
2.  **Create a new branch for your feature or bug fix:**
```
bash
    git checkout -b feature/your-feature-name
    
```
or
```
bash
    git checkout -b fix/your-bug-fix
    
```
3.  **Make your changes and commit them:**
```
bash
    git add .
    git commit -m "Add your commit message here"
    
```
4.  **Push your branch to your fork:**
```
bash
    git push origin feature/your-feature-name
    
```
5.  **Create a pull request.**

## License

This project is licensed under the [Specify the license here, e.g., MIT License] - see the `LICENSE.md` file for details.