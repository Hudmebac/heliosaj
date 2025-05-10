'use client';

import * as React from 'react';
import { SlidersHorizontal, Eye, EyeOff, MessageSquareText, MessageSquareOff } from 'lucide-react';
import { useInputControls } from '@/hooks/use-input-controls';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export function InputControlToggle() {
  const { showSliders, toggleSliderVisibility, showTooltips, toggleTooltipVisibility } = useInputControls();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="outline" size="icon" disabled>
        <SlidersHorizontal className="h-[1.2rem] w-[1.2rem]" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="bg-background text-foreground hover:bg-muted" aria-label="Toggle input control style">
          <SlidersHorizontal className="h-[1.2rem] w-[1.2rem]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Input Controls</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent cursor-default">
          <div className="flex items-center justify-between w-full gap-2">
            <Label htmlFor="slider-visibility-switch" className="flex items-center gap-2 cursor-pointer flex-grow">
              {showSliders ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Show Sliders
            </Label>
            <Switch
              id="slider-visibility-switch"
              checked={showSliders}
              onCheckedChange={toggleSliderVisibility}
              aria-label={showSliders ? "Hide sliders" : "Show sliders"}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent cursor-default">
          <div className="flex items-center justify-between w-full gap-2">
            <Label htmlFor="tooltip-visibility-switch" className="flex items-center gap-2 cursor-pointer flex-grow">
              {showTooltips ? <MessageSquareText className="h-4 w-4" /> : <MessageSquareOff className="h-4 w-4" />}
              Show Tooltips
            </Label>
            <Switch
              id="tooltip-visibility-switch"
              checked={showTooltips}
              onCheckedChange={toggleTooltipVisibility}
              aria-label={showTooltips ? "Hide tooltips" : "Show tooltips"}
            />
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}