<template>
    <Html>

    <Head />

    <Tailwind>

        <template #config>
            @import "@maizzle/tailwindcss";

            @theme {
                --color-brand: #ED1B24;
                --color-brand-dark: #C9171F;
                --color-brand-light: #FEE2E3;
                --color-brand-ultralight: #FFF5F5;
                --color-bg-soft: #FDFDFC;
            }
        </template>

        <Body class="m-0 bg-bg-soft font-sans">

            <Container class="mx-auto max-w-7xl px-4 py-8">

                <Section class="rounded-t-xl bg-white px-8 py-7 text-center">

                    <Img
                        src="https://cdn.cococe.rw/meta/business.png"
                        alt="COCOCE Business"
                        width="190"
                        class="mx-auto"
                    />

                </Section>

                <Section class="bg-white px-3 pb-8">

                    <Section class="mb-6 text-center">

                        <div class="inline-block rounded-lg bg-brand-light px-4 py-2">
                            <Text class="m-0 text-sm font-bold text-brand-dark">
                                Store Creation Notification
                            </Text>
                        </div>

                    </Section>

                    <Text class="mt-6 text-base leading-6 text-gray-700">
                        Hello {{ firstName }},
                    </Text>

                    <Text class="text-base leading-6 text-gray-700">
                        Your store
                        <strong class="text-brand">{{ storeName }}</strong>
                        has been created for
                        <strong class="text-gray-900">{{ businessName }}</strong> business account.
                    </Text>

                    <Section class="my-6 rounded-lg border border-brand-light bg-brand-ultralight px-5 py-4">

                        <Text class="m-0 text-sm font-bold text-brand-dark">
                            Your store is ready to manage
                        </Text>

                        <Text class="m-0 mt-2 text-sm leading-5 text-gray-600">
                            You can now access your business dashboard to manage
                            your store, products, orders, and other business
                            activities.
                        </Text>

                    </Section>

                    <Text class="mt-6 text-sm leading-6 text-gray-600">

                        If you have any questions,
                        <a
                            href="mailto:sales@cococe.rw"
                            class="font-medium text-brand-dark underline"
                        >
                            contact us by email
                        </a>
                        or call
                        <a
                            href="tel:+250787195425"
                            class="font-medium text-brand-dark underline"
                        >
                            +250 787 195 425
                        </a>.

                    </Text>

                    <Section class="mt-7 text-center">

                        <a
                            href="https://business.cococe.rw/dashboard"
                            class="font-medium text-brand-dark underline">
                            Go to Dashboard
                        </a>

                    </Section>

                    <Section class="mt-8 border-t border-gray-200 pt-6">

                        <Text class="m-0 text-sm leading-5 text-gray-500">

                            If you did not create this store or believe this
                            message was sent to you in error, please

                            <a
                                href="mailto:sales@cococe.rw"
                                class="font-medium text-brand-dark underline"
                            >
                                contact us
                            </a>.

                        </Text>

                    </Section>

                </Section>

                <Section class="rounded-b-xl bg-bg-soft px-3 py-7 text-center">

                    <Img
                        src="https://cdn.cococe.rw/meta/business.png"
                        alt="COCOCE Business"
                        width="90"
                        class="mx-auto"
                    />

                    <Text class="m-0 mt-3 text-xs text-gray-400">
                        © 2026 COCOCE. All rights reserved.
                    </Text>

                </Section>

            </Container>

        </Body>

    </Tailwind>

    </Html>
</template>


<script setup>

defineProps({

    firstName: {
        type: String,
        default: '— Not stated'
    },

    storeName: {
        type: String,
        default: '— Not stated'
    },

    businessName: {
        type: String,
        default: '— Not stated'
    },

    portalUrl: {
        type: String,
        default: 'https://business.cococe.rw/dashboard'
    }

});

</script>