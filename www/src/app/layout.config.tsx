import { type HomeLayoutProps as BaseLayoutProps } from 'fumadocs-ui/home-layout';
import { Github, BookOpen } from 'lucide-react';

export const baseOptions: BaseLayoutProps = {
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <div className="size-6 rounded bg-gradient-to-br from-blue-500 to-purple-600" />
        <span className="font-bold text-lg">Lorm</span>
      </div>
    ),
    transparentMode: 'top'
  },
  links: [
    {
      text: 'Documentation',
      url: '/docs',
      icon: <BookOpen className="size-4" />
    },
    {
      text: 'GitHub',
      url: 'https://github.com/your-org/lorm',
      icon: <Github className="size-4" />,
      external: true
    }
  ]
};