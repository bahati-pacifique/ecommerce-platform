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

                    <Img src="https://cdn.cococe.rw/meta/business.png" alt="COCOCE Business" width="190"
                        class="mx-auto" />

                </Section>

                <Section class="bg-white px-3 pb-8">

                    <Section class="mb-6 text-center">

                        <div class="inline-block rounded-lg bg-brand-light px-4 py-2">
                            <Text class="m-0 text-sm font-bold text-brand-dark">
                                Business Application Confirmation
                            </Text>
                        </div>

                    </Section>

                    <Heading as="h1" class="m-0 text-center text-2xl font-bold text-gray-900">
                        Thank You for Registering
                    </Heading>


                    <Text class="mt-6 text-base leading-6 text-gray-700">
                        Hello {{ firstName }},
                    </Text>


                    <Text class="text-base leading-6 text-gray-700">
                        Thank you for your application to
                        <strong class="text-brand">COCOCE Business</strong>.
                        Your application has been
                        successfully received.
                    </Text>


                    <Section class="my-6 rounded-lg border border-brand-light bg-brand-ultralight px-5 py-4">

                        <Text class="m-0 text-sm font-bold text-brand-dark">
                            Your registration is {{ applicationStatus }}
                        </Text>

                        <Text class="m-0 mt-2 text-sm leading-5 text-gray-600">
                            Our team will review the information you provided.
                            You will receive another notification once a
                            decision has been made.
                        </Text>

                    </Section>

                    <Heading as="h2" class="mb-4 text-lg font-bold text-gray-900">
                        Registration Details
                    </Heading>


                    <Section class="rounded-lg border border-gray-200 bg-gray-50 px-5 py-4">

                        <Text class="m-0 py-1 text-sm text-gray-600">
                            <strong class="text-gray-900">
                                Reference Number:
                            </strong>
                            <br />
                            {{ referenceNumber }}
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
                                Email:
                            </strong>
                            <br />
                            {{ email }}
                        </Text>


                        <Text class="m-0 py-1 text-sm text-gray-600">
                            <strong class="text-gray-900">
                                Status:
                            </strong>
                            <br />

                            <span class="font-bold text-brand-dark">
                                {{ applicationStatus }}
                            </span>
                        </Text>

                    </Section>

                    <Heading as="h2" class="mt-8 mb-3 text-lg font-bold text-gray-900">
                        What Happens Next?
                    </Heading>


                    <Text class="m-0 text-sm leading-6 text-gray-600">
                        Your application will be reviewed by our team for
                        validation, normally within 1–2 working days.
                        Our team may contact you using the contact information
                        provided in your application.
                    </Text>


                    <Text class="mt-3 text-sm leading-6 text-gray-600">
                        Once your application has been reviewed, you will
                        receive a confirmation email at this email address or
                        another contact address provided during registration.
                    </Text>

                    <Text class="mt-3 text-sm leading-6 text-gray-600">
                        Please keep your application reference number
                        <strong class="text-gray-900">
                            {{ referenceNumber }}
                        </strong>
                        for future communication regarding your application.
                    </Text>

                    <Text class="mt-4 text-sm leading-5 text-gray-500">
                        Thank you for joining
                        <span class="font-bold text-brand">
                            COCOCE Business
                        </span>.
                    </Text>

                    <Section class="mt-7 text-center">

                        <a :href="`https://business.cococe.rw/applications/${referenceNumber}`" class="font-medium text-brand-dark underline">
                            View Registration
                        </a>

                    </Section>

                    <Section class="mt-8 border-t border-gray-200 pt-6">

                        <Text class="m-0 text-sm leading-5 text-gray-500">
                            If you did not submit this registration or believe
                            this message was sent to you in error, please
                            contact
                            <a href="https://admin.cococe.rw/support" class="font-medium text-brand-dark underline">
                                COCOCE Business Support
                            </a>
                            or call us at
                            <a href="tel:+250787195425" class="font-medium text-brand-dark">
                                +250 787 195 425
                            </a>.
                        </Text>

                    </Section>

                </Section>


                <Section class="rounded-b-xl bg-bg-soft px-3 py-7 text-center">

                    <Img src="https://cdn.cococe.rw/meta/business.png" alt="COCOCE Business" width="90"
                        class="mx-auto" />

                    <Text class="m-0 mt-1 text-xs leading-5 text-gray-500">
                        This is an automated notification regarding your
                        vendor registration.
                    </Text>


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

        businessName: {
            type: String,
            default: '— Not stated'
        },

        email: {
            type: String,
            default: '— Not stated'
        },

        vendorId: {
            type: [String, Number],
            default: '— Not stated'
        },

        applicationStatus: {
            type: String,
            default: 'Not stated'
        },

        referenceNumber: {
            type: String,
            default: 'Not stated'
        },

        portalUrl: {
            type: String,
            default: 'https://cococe.rw'
        }

    });

</script>