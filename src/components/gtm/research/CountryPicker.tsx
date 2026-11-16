import { useState } from 'react';
import { Check, ChevronsUpDown, Globe2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { countryByCode, RESEARCH_COUNTRIES, RESEARCH_REGIONS, type ResearchRegion } from '@/lib/researchCountries';
import { cn } from '@/lib/utils';

/**
 * "Where" for customer research: any number of countries, with whole regions
 * one click away. No countries means any country.
 */
export function CountryPicker({ value, onChange }: { value: readonly string[]; onChange: (codes: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const selected = new Set(value);
  const toggle = (code: string) => onChange(selected.has(code) ? value.filter((item) => item !== code) : [...value, code]);
  const regionCodes = (region: ResearchRegion) => RESEARCH_COUNTRIES.filter((country) => country.region === region).map((country) => country.code);
  const addRegion = (region: ResearchRegion) => {
    const codes = regionCodes(region);
    const all = codes.every((code) => selected.has(code));
    onChange(all ? value.filter((code) => !codes.includes(code)) : [...value, ...codes.filter((code) => !selected.has(code))]);
  };

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label="Choose countries" className="w-full max-w-md justify-between font-normal">
            <span className="inline-flex items-center gap-2 truncate">
              <Globe2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              {value.length ? `${value.length} ${value.length === 1 ? 'country' : 'countries'} selected` : 'Any country'}
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden="true" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(22rem,calc(100vw-2rem))] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search countries or regions" />
            <CommandList className="max-h-72">
              <CommandEmpty>No country found.</CommandEmpty>
              <CommandGroup heading="Regions">
                {RESEARCH_REGIONS.map((region) => {
                  const codes = regionCodes(region);
                  const all = codes.every((code) => selected.has(code));
                  return (
                    <CommandItem key={region} value={`region ${region}`} onSelect={() => addRegion(region)}>
                      <Check className={cn('mr-2 h-4 w-4', all ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                      {all ? `Remove ${region}` : `All of ${region}`}
                      <span className="ml-auto text-xs text-muted-foreground">{codes.length}</span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandGroup heading="Countries">
                {RESEARCH_COUNTRIES.map((country) => (
                  <CommandItem key={country.code} value={`${country.name} ${country.aliases.join(' ')} ${country.code}`} onSelect={() => toggle(country.code)}>
                    <Check className={cn('mr-2 h-4 w-4', selected.has(country.code) ? 'opacity-100' : 'opacity-0')} aria-hidden="true" />
                    {country.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value.length ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {value.map((code) => (
            <span key={code} className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs text-foreground">
              {countryByCode(code)?.name ?? code}
              <button type="button" aria-label={`Remove ${countryByCode(code)?.name ?? code}`} className="text-muted-foreground hover:text-foreground" onClick={() => toggle(code)}>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
          <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline" onClick={() => onChange([])}>Clear all</button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        {value.length
          ? 'Only organisations whose own website confirms they are based in these countries are kept.'
          : 'No countries chosen: research looks anywhere.'}
      </p>
    </div>
  );
}
