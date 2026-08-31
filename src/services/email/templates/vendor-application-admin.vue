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

            <Container class="mx-auto max-w-2xl px-4 py-8">

                <Section class="rounded-t-xl bg-white px-8 py-7 text-center">

                    <Img src="https://cdn.cococe.rw/meta/business.png" alt="COCOCE Business" width="180"
                        class="mx-auto" />

                </Section>

                <Section class="bg-white px-8 pb-8">

                    <Section class="mb-6 text-center">

                        <div class="inline-block rounded-full bg-brand-light px-4 py-2">
                            <Text class="m-0 text-sm font-bold text-brand-dark">
                                New Business/Vendor Application
                            </Text>
                        </div>

                    </Section>

                    <Heading as="h1" class="m-0 text-center text-2xl font-bold text-gray-900">
                        Application Requires Review
                    </Heading>

                    <Text class="mt-6 text-base leading-6 text-gray-700">
                        A new vendor application has been submitted and is
                        ready for review.
                    </Text>

                    <Section class="my-6 rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">

                        <Text class="m-0 py-1 text-sm text-gray-600">
                            <strong class="text-gray-900">
                                Applicant:
                            </strong>
                            <br />
                            {{ applicantName }}
                        </Text>

                        <Text class="m-0 py-1 text-sm text-gray-600">
                            <strong class="text-gray-900">
                                Business Name:
                            </strong>
                            <br />
                            {{ businessName }}
                        </Text>

                        <Text class="m-0 py-1 text-sm text-gray-600">
                            <strong class="text-gray-900">
                                Reference Number:
                            </strong>
                            <br />
                            {{ referenceNumber }}
                        </Text>

                        <Text class="m-0 py-1 text-sm text-gray-600">
                            <strong class="text-gray-900">
                                Submitted:
                            </strong>
                            <br />
                            {{ submittedAt }}
                        </Text>

                    </Section>


                    <!-- CTA -->
                    <Section class="mt-7 text-center">

                        <a :href="`https://admin.cococe.rw/dashboard/vendor/applications/${referenceNumber}`"
                            class="inline-block rounded-md bg-brand px-6 py-3 text-sm font-bold text-white no-underline">
                            Review Application
                        </a>

                    </Section>

                    <Section class="mt-8 border-t border-gray-200 pt-6">

                        <Text class="m-0 text-xs leading-5 text-gray-400">
                            This is an automated internal notification from
                            COCOCE Business.
                        </Text>

                    </Section>

                </Section>

                <Section class="rounded-b-xl bg-bg-soft px-8 py-6 text-center">

                    <Text class="m-0 text-sm font-bold text-brand-dark">
                        COCOCE Business
                    </Text>

                    <Text class="m-0 mt-1 text-xs text-gray-400">
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

        applicantName: {
            type: String,
            default: '— Not stated'
        },

        businessName: {
            type: String,
            default: '— Not stated'
        },
        referenceNumber: {
            type: String,
            default: '— Not stated'
        },

        submittedAt: {
            type: String,
            default: '— Not stated'
        },

        reviewUrl: {
            type: String,
            default: 'https://admin.cococe.rw/dashboard/vendor-applications'
        }

    });

</script>