'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CreditCard, Loader2, Lock, MapPin, Truck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

type CheckoutCartItem = {
  id?: string;
  productId?: string;
  quantity: number;
  price: number;
  product?: {
    id?: string;
    name?: string;
    slug?: string;
    images?: string[];
    sku?: string;
  };
};

type CheckoutFormProps = {
  cartItems?: CheckoutCartItem[];
  subtotal?: number;
  shippingAmount?: number;
  taxAmount?: number;
  total?: number;
};

type FormData = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  shippingAddress1: string;
  shippingAddress2: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  billingSameAsShipping: boolean;
  billingAddress1: string;
  billingAddress2: string;
  billingCity: string;
  billingState: string;
  billingPostalCode: string;
  billingCountry: string;
  cardholderName: string;
};

type FormErrors = Partial<Record<keyof FormData, string>> & {
  form?: string;
};

const DEFAULT_SHIPPING = 9.99;
const DEFAULT_TAX_RATE = 0.08;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value || 0);
}

function getString(value: unknown) {
  return typeof value === 'string' ? value : '';
}

export function CheckoutForm({
  cartItems = [],
  subtotal: subtotalProp,
  shippingAmount: shippingAmountProp,
  taxAmount: taxAmountProp,
  total: totalProp,
}: CheckoutFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errors, setErrors] = useState<FormErrors>({});
  const [formData, setFormData] = useState<FormData>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    shippingAddress1: '',
    shippingAddress2: '',
    shippingCity: '',
    shippingState: '',
    shippingPostalCode: '',
    shippingCountry: 'US',
    billingSameAsShipping: true,
    billingAddress1: '',
    billingAddress2: '',
    billingCity: '',
    billingState: '',
    billingPostalCode: '',
    billingCountry: 'US',
    cardholderName: '',
  });

  const subtotal = useMemo(() => {
    if (typeof subtotalProp === 'number') return subtotalProp;
    return cartItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, [cartItems, subtotalProp]);

  const shippingAmount = useMemo(() => {
    if (typeof shippingAmountProp === 'number') return shippingAmountProp;
    return subtotal > 100 ? 0 : DEFAULT_SHIPPING;
  }, [shippingAmountProp, subtotal]);

  const taxAmount = useMemo(() => {
    if (typeof taxAmountProp === 'number') return taxAmountProp;
    return Number((subtotal * DEFAULT_TAX_RATE).toFixed(2));
  }, [subtotal, taxAmountProp]);

  const total = useMemo(() => {
    if (typeof totalProp === 'number') return totalProp;
    return Number((subtotal + shippingAmount + taxAmount).toFixed(2));
  }, [shippingAmount, subtotal, taxAmount, totalProp]);

  const itemCount = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }, [cartItems]);

  function handleChange<K extends keyof FormData>(field: K, value: FormData[K]) {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'billingSameAsShipping' && value === true
        ? {
            billingAddress1: '',
            billingAddress2: '',
            billingCity: '',
            billingState: '',
            billingPostalCode: '',
            billingCountry: prev.shippingCountry || 'US',
          }
        : {}),
    }));

    setErrors((prev) => ({
      ...prev,
      [field]: '',
      form: '',
    }));
  }

  function validate() {
    const nextErrors: FormErrors = {};

    if (!formData.email.trim()) nextErrors.email = 'Email is required.';
    else if (!/^\S+@\S+\.\S+$/.test(formData.email)) nextErrors.email = 'Enter a valid email address.';

    if (!formData.firstName.trim()) nextErrors.firstName = 'First name is required.';
    if (!formData.lastName.trim()) nextErrors.lastName = 'Last name is required.';
    if (!formData.phone.trim()) nextErrors.phone = 'Phone number is required.';

    if (!formData.shippingAddress1.trim()) nextErrors.shippingAddress1 = 'Street address is required.';
    if (!formData.shippingCity.trim()) nextErrors.shippingCity = 'City is required.';
    if (!formData.shippingState.trim()) nextErrors.shippingState = 'State / region is required.';
    if (!formData.shippingPostalCode.trim()) nextErrors.shippingPostalCode = 'Postal code is required.';
    if (!formData.shippingCountry.trim()) nextErrors.shippingCountry = 'Country is required.';

    if (!formData.billingSameAsShipping) {
      if (!formData.billingAddress1.trim()) nextErrors.billingAddress1 = 'Billing street address is required.';
      if (!formData.billingCity.trim()) nextErrors.billingCity = 'Billing city is required.';
      if (!formData.billingState.trim()) nextErrors.billingState = 'Billing state / region is required.';
      if (!formData.billingPostalCode.trim()) nextErrors.billingPostalCode = 'Billing postal code is required.';
      if (!formData.billingCountry.trim()) nextErrors.billingCountry = 'Billing country is required.';
    }

    if (!formData.cardholderName.trim()) nextErrors.cardholderName = 'Cardholder name is required.';
    if (cartItems.length === 0) nextErrors.form = 'Your cart is empty. Add items before checking out.';

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate()) return;

    setIsSubmitting(true);
    setSuccessMessage('');
    setErrors({});

    const shippingAddress = {
      name: `${formData.firstName} ${formData.lastName}`.trim(),
      line1: formData.shippingAddress1,
      line2: formData.shippingAddress2 || '',
      city: formData.shippingCity,
      state: formData.shippingState,
      postalCode: formData.shippingPostalCode,
      country: formData.shippingCountry,
      phone: formData.phone,
    };

    const billingAddress = formData.billingSameAsShipping
      ? shippingAddress
      : {
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          line1: formData.billingAddress1,
          line2: formData.billingAddress2 || '',
          city: formData.billingCity,
          state: formData.billingState,
          postalCode: formData.billingPostalCode,
          country: formData.billingCountry,
          phone: formData.phone,
        };

    try {
      const payload = {
        email: formData.email,
        customer: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
        },
        items: cartItems.map((item) => ({
          productId: item.productId || item.product?.id || item.id || '',
          quantity: Number(item.quantity || 0),
        })),
        shippingAddress,
        billingAddress,
        billingSameAsShipping: formData.billingSameAsShipping,
        paymentMethod: 'card',
        cardholderName: formData.cardholderName,
        amounts: {
          subtotal,
          shipping: shippingAmount,
          tax: taxAmount,
          total,
        },
      };

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setErrors({
          form: getString(data?.error) || getString(data?.message) || 'Unable to process checkout right now.',
        });
        return;
      }

      setSuccessMessage('Order placed successfully. Redirecting to your confirmation page...');

      const orderId = getString(data?.order?.id) || getString(data?.id);
      const checkoutUrl = getString(data?.checkoutUrl) || getString(data?.url);

      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      if (orderId) {
        router.push(`/checkout/success?orderId=${encodeURIComponent(orderId)}`);
        return;
      }

      router.push('/checkout/success');
    } catch {
      setErrors({
        form: 'Something went wrong while placing your order. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="space-y-6">
        {errors.form ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Checkout error</AlertTitle>
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert>
            <Lock className="h-4 w-4" />
            <AlertTitle>Success</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Contact information</CardTitle>
            <CardDescription>We’ll use this to send order updates and receipts.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                aria-invalid={!!errors.email}
              />
              {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email}</p> : null}
            </div>

            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                autoComplete="given-name"
                value={formData.firstName}
                onChange={(e) => handleChange('firstName', e.target.value)}
                aria-invalid={!!errors.firstName}
              />
              {errors.firstName ? <p className="mt-1 text-sm text-red-600">{errors.firstName}</p> : null}
            </div>

            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                autoComplete="family-name"
                value={formData.lastName}
                onChange={(e) => handleChange('lastName', e.target.value)}
                aria-invalid={!!errors.lastName}
              />
              {errors.lastName ? <p className="mt-1 text-sm text-red-600">{errors.lastName}</p> : null}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="phone">Phone number</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="+1 (555) 123-4567"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                aria-invalid={!!errors.phone}
              />
              {errors.phone ? <p className="mt-1 text-sm text-red-600">{errors.phone}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Shipping address
            </CardTitle>
            <CardDescription>Where should we deliver your order?</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="shippingAddress1">Address line 1</Label>
              <Input
                id="shippingAddress1"
                autoComplete="shipping address-line1"
                value={formData.shippingAddress1}
                onChange={(e) => handleChange('shippingAddress1', e.target.value)}
                aria-invalid={!!errors.shippingAddress1}
              />
              {errors.shippingAddress1 ? (
                <p className="mt-1 text-sm text-red-600">{errors.shippingAddress1}</p>
              ) : null}
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="shippingAddress2">Address line 2</Label>
              <Input
                id="shippingAddress2"
                autoComplete="shipping address-line2"
                value={formData.shippingAddress2}
                onChange={(e) => handleChange('shippingAddress2', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="shippingCity">City</Label>
              <Input
                id="shippingCity"
                autoComplete="shipping address-level2"
                value={formData.shippingCity}
                onChange={(e) => handleChange('shippingCity', e.target.value)}
                aria-invalid={!!errors.shippingCity}
              />
              {errors.shippingCity ? <p className="mt-1 text-sm text-red-600">{errors.shippingCity}</p> : null}
            </div>

            <div>
              <Label htmlFor="shippingState">State / Province</Label>
              <Input
                id="shippingState"
                autoComplete="shipping address-level1"
                value={formData.shippingState}
                onChange={(e) => handleChange('shippingState', e.target.value)}
                aria-invalid={!!errors.shippingState}
              />
              {errors.shippingState ? <p className="mt-1 text-sm text-red-600">{errors.shippingState}</p> : null}
            </div>

            <div>
              <Label htmlFor="shippingPostalCode">Postal code</Label>
              <Input
                id="shippingPostalCode"
                autoComplete="shipping postal-code"
                value={formData.shippingPostalCode}
                onChange={(e) => handleChange('shippingPostalCode', e.target.value)}
                aria-invalid={!!errors.shippingPostalCode}
              />
              {errors.shippingPostalCode ? (
                <p className="mt-1 text-sm text-red-600">{errors.shippingPostalCode}</p>
              ) : null}
            </div>

            <div>
              <Label htmlFor="shippingCountry">Country</Label>
              <Input
                id="shippingCountry"
                autoComplete="shipping country"
                placeholder="US"
                value={formData.shippingCountry}
                onChange={(e) => handleChange('shippingCountry', e.target.value)}
                aria-invalid={!!errors.shippingCountry}
              />
              {errors.shippingCountry ? (
                <p className="mt-1 text-sm text-red-600">{errors.shippingCountry}</p>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing address</CardTitle>
            <CardDescription>Use the same address for billing or provide another one.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-start gap-3 rounded-lg border p-4">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300"
                checked={formData.billingSameAsShipping}
                onChange={(e) => handleChange('billingSameAsShipping', e.target.checked)}
              />
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">Billing address is the same as shipping</p>
                <p className="text-sm text-muted-foreground">Recommended for faster checkout.</p>
              </div>
            </label>

            {!formData.billingSameAsShipping ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="billingAddress1">Address line 1</Label>
                  <Input
                    id="billingAddress1"
                    autoComplete="billing address-line1"
                    value={formData.billingAddress1}
                    onChange={(e) => handleChange('billingAddress1', e.target.value)}
                    aria-invalid={!!errors.billingAddress1}
                  />
                  {errors.billingAddress1 ? (
                    <p className="mt-1 text-sm text-red-600">{errors.billingAddress1}</p>
                  ) : null}
                </div>

                <div className="sm:col-span-2">
                  <Label htmlFor="billingAddress2">Address line 2</Label>
                  <Input
                    id="billingAddress2"
                    autoComplete="billing address-line2"
                    value={formData.billingAddress2}
                    onChange={(e) => handleChange('billingAddress2', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="billingCity">City</Label>
                  <Input
                    id="billingCity"
                    autoComplete="billing address-level2"
                    value={formData.billingCity}
                    onChange={(e) => handleChange('billingCity', e.target.value)}
                    aria-invalid={!!errors.billingCity}
                  />
                  {errors.billingCity ? <p className="mt-1 text-sm text-red-600">{errors.billingCity}</p> : null}
                </div>

                <div>
                  <Label htmlFor="billingState">State / Province</Label>
                  <Input
                    id="billingState"
                    autoComplete="billing address-level1"
                    value={formData.billingState}
                    onChange={(e) => handleChange('billingState', e.target.value)}
                    aria-invalid={!!errors.billingState}
                  />
                  {errors.billingState ? <p className="mt-1 text-sm text-red-600">{errors.billingState}</p> : null}
                </div>

                <div>
                  <Label htmlFor="billingPostalCode">Postal code</Label>
                  <Input
                    id="billingPostalCode"
                    autoComplete="billing postal-code"
                    value={formData.billingPostalCode}
                    onChange={(e) => handleChange('billingPostalCode', e.target.value)}
                    aria-invalid={!!errors.billingPostalCode}
                  />
                  {errors.billingPostalCode ? (
                    <p className="mt-1 text-sm text-red-600">{errors.billingPostalCode}</p>
                  ) : null}
                </div>

                <div>
                  <Label htmlFor="billingCountry">Country</Label>
                  <Input
                    id="billingCountry"
                    autoComplete="billing country"
                    value={formData.billingCountry}
                    onChange={(e) => handleChange('billingCountry', e.target.value)}
                    aria-invalid={!!errors.billingCountry}
                  />
                  {errors.billingCountry ? (
                    <p className="mt-1 text-sm text-red-600">{errors.billingCountry}</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment
            </CardTitle>
            <CardDescription>
              Your payment details are securely processed. For the MVP, payment confirmation is handled server-side.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="cardholderName">Cardholder name</Label>
              <Input
                id="cardholderName"
                autoComplete="cc-name"
                placeholder="Name on card"
                value={formData.cardholderName}
                onChange={(e) => handleChange('cardholderName', e.target.value)}
                aria-invalid={!!errors.cardholderName}
              />
              {errors.cardholderName ? (
                <p className="mt-1 text-sm text-red-600">{errors.cardholderName}</p>
              ) : null}
            </div>

            <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Secure payment</p>
              <p className="mt-1">
                Card entry and payment authorization may be completed on the next step depending on your Stripe
                checkout configuration.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="sticky top-24">
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
            <CardDescription>
              {itemCount} {itemCount === 1 ? 'item' : 'items'} in your order
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cartItems.length > 0 ? (
              <div className="space-y-3">
                {cartItems.map((item, index) => {
                  const lineTotal = Number(item.price || 0) * Number(item.quantity || 0);
                  const key = item.productId || item.product?.id || item.id || `${item.product?.name || 'item'}-${index}`;

                  return (
                    <div key={key} className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{item.product?.name || 'Product'}</p>
                        <p className="text-xs text-muted-foreground">
                          Qty {item.quantity}
                          {item.product?.sku ? ` • SKU ${item.product.sku}` : ''}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-medium">{formatCurrency(lineTotal)}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Your cart is empty.
              </div>
            )}

            <Separator />

            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingAmount === 0 ? 'Free' : formatCurrency(shippingAmount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estimated tax</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-base font-semibold">Total</span>
              <span className="text-base font-semibold">{formatCurrency(total)}</span>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-medium text-foreground">Shipping estimate</p>
                  <p className="mt-1">
                    Orders over {formatCurrency(100)} qualify for free standard shipping.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || cartItems.length === 0}
              className={cn('w-full', isSubmitting && 'cursor-not-allowed')}
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing order...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Place order
                </>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By placing your order, you agree to our terms and confirm that your information is accurate.
            </p>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}

export default CheckoutForm;