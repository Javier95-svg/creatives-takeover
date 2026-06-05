-- Link the remaining 19 discovery-call mentors to their existing accounts so they
-- receive BOTH the in-app bell (needs user_id) and the email (needs contact_email).
-- Self-contained (sets both columns) and matched on trimmed name, since a few
-- mentor names carry leading whitespace. Rachel Yenko-Martinka is intentionally
-- excluded (no account).
WITH provided(name, email, uid) AS (
  VALUES
    ('Daiana Tokpayeva','daiana.tokpayeva@outlook.com','cc157118-0681-4600-a5fc-d37f5f4b4f31'::uuid),
    ('Matas Ramanauskas','matt.ramanauskas@gmail.com','e1db835c-4149-407e-807e-5ff0b99661c0'),
    ('Sakina Lokhandwala','slsakina27@gmail.com','625f9871-b975-40c5-9b71-a093419c69c8'),
    ('Sharon Praise-Akpunne','sharonpraiseakpunne1@gmail.com','77283f92-7d90-45e2-97aa-3ec500781656'),
    ('Vivian Ubochi','vivian@gooroconsulting.com','5e919674-60ba-42b9-bd18-813f484f7c24'),
    ('Albert Hovhannisyan','albert.hovhannisian@gmail.com','e8ddb66e-142b-4d88-9d4f-7ce3cf18ce14'),
    ('Artur Sindarsky','arturpatser@gmail.com','1f0fe62a-7744-4153-bfcf-4f20b6e820d3'),
    ('Carolina Barthalot','carolinabarthalot@gmail.com','1b0d63d2-13b8-4829-b5a9-75a7bb2f313b'),
    ('Dan Albaghdadi','albaghdadidan@gmail.com','0c160536-d5d3-483b-b222-f801c057fde6'),
    ('Delraj Singh Uppal','d.singh@khalsa.com','2cd4b8ec-5631-4de3-b480-d3c71de5d366'),
    ('Gábor Homik','homik.g@gmail.com','5658607e-80ca-4478-8b3b-74148f1b959d'),
    ('Johnny Bou Malhab','johnny@monochrome.digital','dd972b4a-7e02-41c4-a722-bacead700c9b'),
    ('Katie Brett','katie@pocketplanit.com','a786507a-b45c-4044-9b92-d9db40340f47'),
    ('Lucas Annarattone','lannarattone@gmail.com','089e99ca-18d6-43f5-9687-f60c2d76b2f8'),
    ('Marc Bright','marc_bright@me.com','4eea3ae6-40ec-4bd0-a373-4005343a9e25'),
    ('Matias Pancorvo','pancorvomatias@gmail.com','d4d2ec5d-75ca-482a-8126-2e5a9ff9b98c'),
    ('Pedro Monestel','monestelp93@gmail.com','f7d02d67-dd5b-4ce7-95dd-f6f2c9bdbc35'),
    ('Sophia Lopez Pimenta','lopezpimenta@gmail.com','50695a54-30c6-4b57-969e-b2de733bcd73'),
    ('Yasmine Caxeiro','mine.caxeiro@n1n3consulting.com','357b97ca-c578-43b1-8e48-b438142312ec')
)
UPDATE public.mentors m
SET user_id = p.uid,
    contact_email = p.email
FROM provided p
WHERE TRIM(m.name) = p.name;
