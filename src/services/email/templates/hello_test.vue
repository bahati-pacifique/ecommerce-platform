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

            <Body class="bg-gray-100">

                <Container class="mx-auto max-w-xl bg-white p-8">

                    <Heading class="text-2xl font-bold text-red-600 bg-brand">
                        Hello {{ name }}!
                    </Heading>

                    <Text class="mt-4 text-gray-600">
                        Welcome to Cococe.
                    </Text>

                    <Button
                        href="https://cococe.rw"
                        class="mt-6 bg-red-600 px-6 py-3 font-bold text-white"
                    >
                        Visit Cococe
                    </Button>

                </Container>

            </Body>

        </Tailwind>

    </Html>
</template>

<script setup>

defineProps({
    name: {
        type: String,
        default: "Guest"
    }
});

</script>