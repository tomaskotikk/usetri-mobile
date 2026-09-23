import { useEffect, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import Animated, { FadeIn, FadeInRight, FadeOut } from 'react-native-reanimated'
import { Feather } from '@expo/vector-icons'
import { createOffer, czk, loadServices, type Service } from '../lib/data'
import {
  Banner,
  Button,
  Field,
  Press,
  Segmented,
  ServiceMark,
  Sheet,
  Skeleton,
  Stepper,
} from '../components/ui'
import { CATEGORIES, colors, motion, radius } from '../theme'

type Filter = 'all' | keyof typeof CATEGORIES

/**
 * Two steps: pick the service, then price the seat. Splitting them keeps the
 * catalogue searchable without burying the three fields that actually matter.
 */
export function CreateSheet({
  open,
  userId,
  onClose,
  onCreated,
}: {
  open: boolean
  userId: string
  onClose: () => void
  onCreated: () => void
}) {
  const [services, setServices] = useState<Service[] | null>(null)
  const [picked, setPicked] = useState<Service | null>(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [seats, setSeats] = useState(2)
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open || services) return
    loadServices()
      .then(setServices)
      .catch(() => setServices([]))
  }, [open, services])

  // A fresh sheet every time it opens, so an abandoned draft never reappears.
  useEffect(() => {
    if (open) return
    setPicked(null)
    setQuery('')
    setFilter('all')
    setNote('')
    setError(null)
  }, [open])

  const options = useMemo(
    () => [
      { value: 'all' as Filter, label: 'Vše' },
      ...Object.entries(CATEGORIES).map(([key, value]) => ({
        value: key as Filter,
        label: value.label,
      })),
    ],
    [],
  )

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    return (services ?? []).filter((service) => {
      if (filter !== 'all' && service.category !== filter) return false
      if (!needle) return true
      return `${service.name} ${service.plan}`.toLowerCase().includes(needle)
    })
  }, [services, query, filter])

  const choose = (service: Service) => {
    setPicked(service)
    setSeats(service.seats)
    // The even split is the obvious starting point; the owner can move it.
    setPrice(String(Math.ceil(service.fullPrice / service.seats)))
    setError(null)
  }

  const submit = async () => {
    if (!picked) return
    const value = Number(price.replace(/\s/g, ''))
    if (!Number.isFinite(value) || value < 1 || value > 5000) {
      return setError('Zadej cenu mezi 1 a 5 000 Kč.')
    }

    setBusy(true)
    const result = await createOffer({
      serviceSlug: picked.slug,
      ownerId: userId,
      seatsTotal: seats,
      pricePerSeat: Math.round(value),
      note: note.trim() || null,
    })
    setBusy(false)

    if ('error' in result) return setError(result.error)
    onCreated()
    onClose()
  }

  const perSeat = Number(price.replace(/\s/g, '')) || 0
  const collected = perSeat * Math.max(0, seats - 1)
  const yourCost = picked ? Math.max(0, picked.fullPrice - collected) : 0

  return (
    <Sheet
      open={open}
      onClose={onClose}
      full
      title={picked ? 'Nastav nabídku' : 'Vyber službu'}
    >
      {!picked ? (
        <View style={{ gap: 14, flex: 1 }}>
          <Field
            placeholder="Hledat v katalogu…"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Segmented options={options} value={filter} onChange={setFilter} />

          <ScrollView
            style={styles.catalogue}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {services === null ? (
              <View style={{ gap: 8 }}>
                <Skeleton height={62} />
                <Skeleton height={62} />
                <Skeleton height={62} />
              </View>
            ) : visible.length === 0 ? (
              <Text style={styles.none}>Nic takového v katalogu není.</Text>
            ) : (
              <View style={{ gap: 8 }}>
                {visible.map((service) => (
                  <Press key={service.slug} onPress={() => choose(service)} scaleTo={0.98}>
                    <View style={styles.option}>
                      <ServiceMark name={service.name} color={service.color} slug={service.slug} size={38} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={styles.optionName} numberOfLines={1}>
                          {service.name}
                        </Text>
                        <Text style={styles.optionPlan} numberOfLines={1}>
                          {service.plan}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.optionPrice}>{czk(service.fullPrice)}</Text>
                        <Text style={styles.optionSeats}>{service.seats} míst</Text>
                      </View>
                    </View>
                  </Press>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      ) : (
        <Animated.View style={{ flex: 1 }} entering={FadeInRight.duration(motion.base)} exiting={FadeOut}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 24 }}
          >
            <Press onPress={() => setPicked(null)} scaleTo={0.98}>
              <View style={styles.chosen}>
                <ServiceMark name={picked.name} color={picked.color} slug={picked.slug} size={40} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.optionName}>{picked.name}</Text>
                  <Text style={styles.optionPlan}>{picked.plan}</Text>
                </View>
                <View style={styles.change}>
                  <Feather name="refresh-cw" size={13} color={colors.muted} />
                  <Text style={styles.changeText}>Změnit</Text>
                </View>
              </View>
            </Press>

            <View style={styles.block}>
              <Text style={styles.blockLabel}>Kolik lidí se vejde</Text>
              <Stepper value={seats} min={2} max={12} onChange={setSeats} />
            </View>

            <View style={{ marginTop: 18 }}>
              <Field
                label="Cena za osobu"
                placeholder="0"
                value={price}
                onChangeText={setPrice}
                keyboardType="number-pad"
                suffix="Kč / měsíc"
              />
            </View>

            <View style={{ marginTop: 18 }}>
              <Field
                label="Poznámka (nepovinné)"
                placeholder="Např. platba k 1. dni v měsíci"
                value={note}
                onChangeText={setNote}
                maxLength={400}
                multiline
              />
            </View>

            <Animated.View entering={FadeIn.duration(motion.base)} style={styles.math}>
              <MathRow label="Plná cena tarifu" value={czk(picked.fullPrice)} />
              <MathRow label={`Vybereš od ${seats - 1} lidí`} value={czk(collected)} />
              <View style={styles.mathDivider} />
              <MathRow label="Zbyde na tebe" value={czk(yourCost)} strong />
            </Animated.View>

            {error && (
              <View style={{ marginTop: 14 }}>
                <Banner tone="error" text={error} />
              </View>
            )}

            <Button
              label="Založit nabídku"
              onPress={submit}
              loading={busy}
              icon="check"
              style={{ marginTop: 18 }}
            />
            <Text style={styles.hint}>
              Místo pro tebe se započítá automaticky — nabízíš tedy {seats - 1} míst ostatním.
            </Text>
          </ScrollView>
        </Animated.View>
      )}
    </Sheet>
  )
}

function MathRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.mathRow}>
      <Text style={[styles.mathLabel, strong && styles.mathLabelStrong]}>{label}</Text>
      <Text style={[styles.mathValue, strong && styles.mathValueStrong]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  catalogue: { flex: 1 },
  none: { color: colors.muted, fontSize: 13.5, textAlign: 'center', paddingVertical: 28 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
  },
  optionName: { color: colors.navyDeep, fontSize: 15, fontWeight: '700', letterSpacing: -0.2 },
  optionPlan: { color: colors.muted, fontSize: 12, marginTop: 1.5 },
  optionPrice: { color: colors.navyDeep, fontSize: 14, fontWeight: '700' },
  optionSeats: { color: colors.muted, fontSize: 11, marginTop: 1.5 },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 12,
  },
  change: { alignItems: 'center', gap: 3 },
  changeText: { color: colors.muted, fontSize: 10.5, fontWeight: '600' },
  block: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  blockLabel: { color: colors.navyDeep, fontSize: 13, fontWeight: '600' },
  math: {
    marginTop: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 14,
    gap: 9,
  },
  mathRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mathLabel: { color: colors.muted, fontSize: 13 },
  mathLabelStrong: { color: colors.navyDeep, fontWeight: '700' },
  mathValue: { color: colors.navyDeep, fontSize: 13.5, fontWeight: '600' },
  mathValueStrong: { color: colors.brandForeground, fontSize: 16, fontWeight: '800' },
  mathDivider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  hint: {
    color: colors.muted,
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 12,
  },
})
