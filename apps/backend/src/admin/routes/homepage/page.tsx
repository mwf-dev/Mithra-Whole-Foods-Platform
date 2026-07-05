import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Container, Heading, Text, Button, Input, Label, toast } from "@medusajs/ui"
import { useState, useEffect } from "react"

const HomepageSettings = () => {
  const [loading, setLoading] = useState(false)
  const [settings, setSettings] = useState<any>({
    hero_title: "",
    hero_subtitle: "",
    hero_image_url: "",
    promo_card_1_title: "",
    promo_card_1_url: "",
    promo_card_2_title: "",
    promo_card_2_url: "",
  })

  // Fetch initial data
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/admin/homepage", {
          headers: {
            "Content-Type": "application/json"
          }
        })
        const data = await res.json()
        if (data.homepage_settings) {
          setSettings(data.homepage_settings)
        }
      } catch (err) {
        console.error("Failed to load homepage settings", err)
      }
    }
    fetchSettings()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setSettings((prev: any) => ({ ...prev, [name]: value }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append("files", file)

    try {
      setLoading(true)
      const res = await fetch("/admin/uploads", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.files && data.files.length > 0) {
        const url = data.files[0].url
        setSettings((prev: any) => ({ ...prev, [fieldName]: url }))
        toast.success("Image uploaded successfully!")
      } else {
        toast.error("Failed to upload image")
      }
    } catch (err) {
      console.error(err)
      toast.error("Upload error")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      const res = await fetch("/admin/homepage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
      })
      if (res.ok) {
        toast.success("Settings saved successfully!")
      } else {
        toast.error("Failed to save settings")
      }
    } catch (err) {
      console.error(err)
      toast.error("Error saving settings")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <div className="flex flex-col gap-8 py-4">
        <div>
          <Heading level="h1">Homepage Settings</Heading>
          <Text className="text-ui-fg-subtle">
            Manage your homepage hero and promotional banners here.
          </Text>
        </div>

        {/* Hero Section */}
        <div className="flex flex-col gap-4 border-b pb-6">
          <Heading level="h2">Hero Section</Heading>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Hero Title</Label>
              <Input 
                name="hero_title" 
                value={settings.hero_title || ""} 
                onChange={handleChange} 
                placeholder="E.g. Traditional Foods" 
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <Label>Hero Subtitle</Label>
              <Input 
                name="hero_subtitle" 
                value={settings.hero_subtitle || ""} 
                onChange={handleChange} 
                placeholder="E.g. 100% Organic" 
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Hero Background Image</Label>
            {settings.hero_image_url && (
              <img src={settings.hero_image_url} alt="Hero" className="h-40 object-cover rounded-md border w-full max-w-md mb-2" />
            )}
            <Input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, "hero_image_url")} 
            />
            <Text className="text-ui-fg-muted text-xs">Upload a new image to replace the current one.</Text>
          </div>
        </div>

        {/* Promo Card 1 */}
        <div className="flex flex-col gap-4 border-b pb-6">
          <Heading level="h2">Promo Banner 1</Heading>
          
          <div className="flex flex-col gap-2">
            <Label>Promo 1 Title</Label>
            <Input 
              name="promo_card_1_title" 
              value={settings.promo_card_1_title || ""} 
              onChange={handleChange} 
              placeholder="E.g. Spices" 
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Promo 1 Image</Label>
            {settings.promo_card_1_url && (
              <img src={settings.promo_card_1_url} alt="Promo 1" className="h-32 object-cover rounded-md border w-full max-w-xs mb-2" />
            )}
            <Input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, "promo_card_1_url")} 
            />
          </div>
        </div>

        {/* Promo Card 2 */}
        <div className="flex flex-col gap-4 border-b pb-6">
          <Heading level="h2">Promo Banner 2</Heading>
          
          <div className="flex flex-col gap-2">
            <Label>Promo 2 Title</Label>
            <Input 
              name="promo_card_2_title" 
              value={settings.promo_card_2_title || ""} 
              onChange={handleChange} 
              placeholder="E.g. Grains" 
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Promo 2 Image</Label>
            {settings.promo_card_2_url && (
              <img src={settings.promo_card_2_url} alt="Promo 2" className="h-32 object-cover rounded-md border w-full max-w-xs mb-2" />
            )}
            <Input 
              type="file" 
              accept="image/*" 
              onChange={(e) => handleFileUpload(e, "promo_card_2_url")} 
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button 
            variant="primary" 
            onClick={handleSave} 
            isLoading={loading}
          >
            Save Settings
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Homepage",
  icon: BuildingStorefront,
})

export default HomepageSettings
