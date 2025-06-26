
'use client';

import * as React from 'react';
import { SlidersHorizontal, Eye, EyeOff, MessageSquareText, MessageSquareOff, RefreshCw, AlertCircle } from 'lucide-react';
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
import { cn } from '@/lib/utils';

export function InputControlToggle() {
  const { 
    showSliders, 
    toggleSliderVisibility, 
    showTooltips, 
    toggleTooltipVisibility, // Use isMounted from context
    isMounted // Use isMounted from context
  } = useInputControls();
  
  const [settingsChangedSinceLoad, setSettingsChangedSinceLoad] = React.useState(false);

  // Refs to store initial values after mount
  const initialSlidersRef = React.useRef(showSliders);
  const initialTooltipsRef = React.useRef(showTooltips);

  React.useEffect(() => {
    if (isMounted) {
      initialSlidersRef.current = showSliders;
      initialTooltipsRef.current = showTooltips;
    }
  }, [isMounted, showSliders, showTooltips]);

  const handleSliderToggle = () => {
    toggleSliderVisibility();
    // Check against the value *before* toggle, to see if it's different from initial
    if (isMounted && showSliders !== initialSlidersRef.current) {
      setSettingsChangedSinceLoad(true);
    }
  };

  const handleTooltipToggle = () => {
    toggleTooltipVisibility();
    // Check against the value *before* toggle
    if (isMounted && showTooltips !== initialTooltipsRef.current) {
      setSettingsChangedSinceLoad(true);
    }
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!isMounted) {
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
          {/* Removed focus:bg-transparent to allow default hover/focus styles */}
          <div className="flex items-center justify-between w-full gap-2">
            <Label htmlFor="slider-visibility-switch" className="flex items-center gap-2 cursor-pointer flex-grow">
              {showSliders ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              Show Sliders
            </Label>
            <Switch
              id="slider-visibility-switch"
              checked={showSliders}
              onCheckedChange={handleSliderToggle}
              aria-label={showSliders ? "Hide sliders" : "Show sliders"}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="focus:bg-transparent cursor-default">
          {/* Removed focus:bg-transparent to allow default hover/focus styles */}
          <div className="flex items-center justify-between w-full gap-2">
            <Label htmlFor="tooltip-visibility-switch" className="flex items-center gap-2 cursor-pointer flex-grow">
              {showTooltips ? <MessageSquareText className="h-4 w-4" /> : <MessageSquareOff className="h-4 w-4" />}
              Show Tooltips
            </Label>
            <Switch
              id="tooltip-visibility-switch"
              checked={showTooltips}
              onCheckedChange={handleTooltipToggle}
              aria-label={showTooltips ? "Hide tooltips" : "Show tooltips"}
            />
          </div>
        </DropdownMenuItem>
        {settingsChangedSinceLoad && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onSelect={(e) => e.preventDefault()} 
              className="focus:bg-transparent cursor-default text-xs text-muted-foreground p-2"
              // Make this item non-focusable or visually distinct as non-interactive
              role="presentation" 
              aria-hidden="true"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <span>For changes to fully apply, a page reload may be needed.</span>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleRefresh} className="cursor-pointer">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
