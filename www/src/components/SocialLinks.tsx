import { Github, Twitter, Globe, Instagram, VenetianMask } from "lucide-react";

const socialLinks = [
  {
    name: "GitHub",
    icon: Github,
    url: "https://github.com/JohnClever/lorm/discussions",
    description: "Join github discussions",
  },
  {
    name: "Website",
    icon: VenetianMask,
    url: "https://discord.gg/eUCav29w",
    description: "Visit our Discord channel",
  },

  {
    name: "Twitter",
    icon: Twitter,
    url: "https:/x.com/jc_johnclever",
    description: "Follow updates",
  },
];

export default function SocialLinks() {
  const hoverColors = [
    'group-hover:text-[var(--neon-purple)] group-hover:drop-shadow-[0_0_8px_var(--neon-purple)]',
    'group-hover:text-[var(--neon-blue)] group-hover:drop-shadow-[0_0_8px_var(--neon-blue)]',
    'group-hover:text-[var(--neon-pink)] group-hover:drop-shadow-[0_0_8px_var(--neon-pink)]',
  ];

  return (
    <div className="flex justify-center space-x-6">
      {socialLinks.map((link, index) => {
        const Icon = link.icon;
        return (
          <a
            key={link.name}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center justify-center w-12 h-12 bg-[var(--glass-bg)] backdrop-blur-md rounded-xl border border-[var(--glass-border)] hover:bg-[var(--glass-bg)] hover:scale-110 hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300"
            title={link.description}
          >
            <Icon className={`w-5 h-5 text-gray-300 transition-all duration-300 ${hoverColors[index % hoverColors.length]}`} />
          </a>
        );
      })}
    </div>
  );
}
