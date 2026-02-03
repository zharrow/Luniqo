'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  PRODUCT_CATALOG,
  PRODUCT_CATEGORIES,
  type CatalogProduct,
} from '@/lib/data/product-catalog'

interface ProductComboboxProps {
  value: string
  onChange: (value: string) => void
  onSelectProduct?: (product: CatalogProduct | null) => void
  placeholder?: string
  disabled?: boolean
}

export function ProductCombobox({
  value,
  onChange,
  onSelectProduct,
  placeholder = 'Rechercher un produit...',
  disabled = false,
}: ProductComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState(value)

  // Update input when value prop changes (e.g., when editing)
  React.useEffect(() => {
    setInputValue(value)
  }, [value])

  // Filter products based on input
  const filteredProducts = React.useMemo(() => {
    if (!inputValue || inputValue.length < 2) return []

    const normalizedInput = inputValue
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')

    return PRODUCT_CATALOG.filter((product) => {
      const normalizedName = product.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
      return normalizedName.includes(normalizedInput)
    }).slice(0, 10) // Limit to 10 results
  }, [inputValue])

  // Group products by category
  const groupedProducts = React.useMemo(() => {
    const groups: Record<string, CatalogProduct[]> = {}
    filteredProducts.forEach((product) => {
      if (!groups[product.category]) {
        groups[product.category] = []
      }
      groups[product.category].push(product)
    })
    return groups
  }, [filteredProducts])

  const handleSelect = (product: CatalogProduct) => {
    setInputValue(product.name)
    onChange(product.name)
    onSelectProduct?.(product)
    setOpen(false)
  }

  const handleInputChange = (newValue: string) => {
    setInputValue(newValue)
    onChange(newValue)
    // Clear product selection when typing manually
    if (newValue !== inputValue) {
      onSelectProduct?.(null)
    }
    if (newValue.length >= 2) {
      setOpen(true)
    }
  }

  const handleCreateNew = () => {
    onChange(inputValue)
    onSelectProduct?.(null)
    setOpen(false)
  }

  // Check if current input matches a catalog product
  const isExactMatch = PRODUCT_CATALOG.some(
    (p) => p.name.toLowerCase() === inputValue.toLowerCase()
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={() => inputValue.length >= 2 && setOpen(true)}
            className="w-full px-4 py-2 pr-10 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-primary-500 bg-background"
            placeholder={placeholder}
            disabled={disabled}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={() => setOpen(!open)}
            disabled={disabled}
          >
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </Button>
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        sideOffset={4}
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Rechercher..."
            value={inputValue}
            onValueChange={handleInputChange}
            className="border-none focus:ring-0"
          />
          <CommandList>
            {filteredProducts.length === 0 && inputValue.length >= 2 ? (
              <CommandEmpty>
                <div className="py-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Aucun produit trouvé
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={handleCreateNew}
                  >
                    <Plus className="h-4 w-4" />
                    Créer "{inputValue}"
                  </Button>
                </div>
              </CommandEmpty>
            ) : (
              <>
                {Object.entries(groupedProducts).map(([category, products]) => {
                  const categoryInfo = PRODUCT_CATEGORIES.find(
                    (c) => c.name === category
                  )
                  return (
                    <CommandGroup
                      key={category}
                      heading={
                        <span className="flex items-center gap-2">
                          <span>{categoryInfo?.emoji || '📦'}</span>
                          <span>{category}</span>
                        </span>
                      }
                    >
                      {products.map((product) => (
                        <CommandItem
                          key={product.id}
                          value={product.id}
                          onSelect={() => handleSelect(product)}
                          className="cursor-pointer"
                        >
                          <span className="mr-2 text-lg">{product.emoji}</span>
                          <div className="flex-1">
                            <div className="font-medium">{product.name}</div>
                            {product.allergens && (
                              <div className="text-xs text-amber-600">
                                Allergènes: {product.allergens}
                              </div>
                            )}
                          </div>
                          <Check
                            className={cn(
                              'ml-auto h-4 w-4',
                              inputValue.toLowerCase() ===
                                product.name.toLowerCase()
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )
                })}

                {/* Option to create custom product */}
                {inputValue.length >= 2 && !isExactMatch && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem
                        onSelect={handleCreateNew}
                        className="cursor-pointer"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        <span>
                          Créer un nouveau produit: <strong>"{inputValue}"</strong>
                        </span>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
